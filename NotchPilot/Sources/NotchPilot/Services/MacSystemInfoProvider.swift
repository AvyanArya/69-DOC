import AppKit
import Darwin
import Foundation
import IOKit.ps
import NotchPilotCore

/// System information from public APIs only: sysctl, Mach VM statistics,
/// libproc (processes owned by the current user) and IOKit power sources.
@MainActor
final class MacSystemInfoProvider: SystemInfoProvider {
    func snapshot() -> SystemSnapshot {
        let info = ProcessInfo.processInfo
        let version = info.operatingSystemVersion
        let thermal: String
        switch info.thermalState {
        case .nominal: thermal = "nominal"
        case .fair: thermal = "fair"
        case .serious: thermal = "serious"
        case .critical: thermal = "critical"
        @unknown default: thermal = "unknown"
        }
        var free: Int64?
        var total: Int64?
        if let values = try? URL(fileURLWithPath: "/").resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey, .volumeTotalCapacityKey]) {
            free = values.volumeAvailableCapacityForImportantUsage
            total = values.volumeTotalCapacity.map(Int64.init)
        }
        return SystemSnapshot(
            operatingSystem: "macOS \(version.majorVersion).\(version.minorVersion).\(version.patchVersion)",
            hardwareModel: Self.sysctlString("hw.model"),
            processorCount: info.activeProcessorCount,
            physicalMemoryBytes: info.physicalMemory,
            memoryUsedBytes: Self.memoryUsed(),
            memoryPressure: Self.memoryPressure(),
            uptimeSeconds: info.systemUptime,
            thermalState: thermal,
            diskFreeBytes: free,
            diskTotalBytes: total
        )
    }

    func topMemoryProcesses(limit: Int) throws -> [ProcessMemoryInfo] {
        let capacity = proc_listallpids(nil, 0)
        guard capacity > 0 else { throw ToolError.failed("Could not list processes.") }
        var pids = [pid_t](repeating: 0, count: Int(capacity) + 64)
        let count = pids.withUnsafeMutableBytes { buffer in
            proc_listallpids(buffer.baseAddress, Int32(buffer.count))
        }
        guard count > 0 else { throw ToolError.failed("Could not list processes.") }
        let uid = getuid()
        // Group helper processes under their app name (e.g. browser renderers).
        var totals: [String: (pid: Int32, bytes: UInt64)] = [:]
        for pid in pids.prefix(Int(count)) where pid > 0 {
            var bsd = proc_bsdinfo()
            let size = Int32(MemoryLayout<proc_bsdinfo>.size)
            guard proc_pidinfo(pid, PROC_PIDTBSDINFO, 0, &bsd, size) == size, bsd.pbi_uid == uid else { continue }
            var usage = rusage_info_v2()
            let result = withUnsafeMutablePointer(to: &usage) { pointer in
                pointer.withMemoryRebound(to: rusage_info_t?.self, capacity: 1) { proc_pid_rusage(pid, RUSAGE_INFO_V2, $0) }
            }
            guard result == 0 else { continue }
            let name = Self.displayName(pid: pid)
            let existing = totals[name]
            totals[name] = (existing?.pid ?? pid, (existing?.bytes ?? 0) + usage.ri_phys_footprint)
        }
        return totals
            .map { ProcessMemoryInfo(pid: $0.value.pid, name: $0.key, memoryBytes: $0.value.bytes) }
            .sorted { $0.memoryBytes > $1.memoryBytes }
            .prefix(limit)
            .map { $0 }
    }

    func battery() -> BatteryInfo? {
        guard let info = IOPSCopyPowerSourcesInfo()?.takeRetainedValue(),
              let list = IOPSCopyPowerSourcesList(info)?.takeRetainedValue() as? [CFTypeRef] else { return nil }
        for source in list {
            guard let description = IOPSGetPowerSourceDescription(info, source)?.takeUnretainedValue() as? [String: Any],
                  description[kIOPSTypeKey] as? String == kIOPSInternalBatteryType else { continue }
            let current = description[kIOPSCurrentCapacityKey] as? Int ?? 0
            let maximum = max(1, description[kIOPSMaxCapacityKey] as? Int ?? 100)
            let charging = description[kIOPSIsChargingKey] as? Bool ?? false
            let pluggedIn = description[kIOPSPowerSourceStateKey] as? String == kIOPSACPowerValue
            let minutesKey = charging ? kIOPSTimeToFullChargeKey : kIOPSTimeToEmptyKey
            let minutes = (description[minutesKey] as? Int).flatMap { $0 >= 0 ? $0 : nil }
            return BatteryInfo(
                percentage: Int((Double(current) / Double(maximum) * 100).rounded()), isCharging: charging, isPluggedIn: pluggedIn,
                minutesRemaining: (pluggedIn && !charging) ? nil : minutes, condition: description["BatteryHealth"] as? String
            )
        }
        return nil
    }

    // MARK: Helpers

    private static func displayName(pid: pid_t) -> String {
        if let app = NSRunningApplication(processIdentifier: pid), let name = app.localizedName {
            return name
        }
        var buffer = [CChar](repeating: 0, count: 256)
        proc_name(pid, &buffer, UInt32(buffer.count))
        let name = String(cString: buffer)
        // "Google Chrome Helper (Renderer)" → "Google Chrome"
        if let range = name.range(of: " Helper") { return String(name[..<range.lowerBound]) }
        return name.isEmpty ? "pid \(pid)" : name
    }

    static func sysctlString(_ name: String) -> String? {
        var size = 0
        guard sysctlbyname(name, nil, &size, nil, 0) == 0, size > 0 else { return nil }
        var buffer = [CChar](repeating: 0, count: size)
        guard sysctlbyname(name, &buffer, &size, nil, 0) == 0 else { return nil }
        return String(cString: buffer)
    }

    private static func memoryUsed() -> UInt64? {
        var stats = vm_statistics64()
        var count = mach_msg_type_number_t(MemoryLayout<vm_statistics64_data_t>.size / MemoryLayout<integer_t>.size)
        let result = withUnsafeMutablePointer(to: &stats) { pointer in
            pointer.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
                host_statistics64(mach_host_self(), HOST_VM_INFO64, $0, &count)
            }
        }
        guard result == KERN_SUCCESS else { return nil }
        let pageSize = UInt64(vm_kernel_page_size)
        // Matches Activity Monitor's "Memory Used": app memory + wired + compressed.
        let internalPages = UInt64(stats.internal_page_count)
        let purgeablePages = UInt64(stats.purgeable_count)
        let app = internalPages > purgeablePages ? internalPages - purgeablePages : 0
        return (app + UInt64(stats.wire_count) + UInt64(stats.compressor_page_count)) * pageSize
    }

    private static func memoryPressure() -> String? {
        var level: Int32 = 0
        var size = MemoryLayout<Int32>.size
        guard sysctlbyname("kern.memorystatus_vm_pressure_level", &level, &size, nil, 0) == 0 else { return nil }
        switch level {
        case 1: return "normal"
        case 2: return "warning"
        case 4: return "critical"
        default: return nil
        }
    }
}
