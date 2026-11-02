import XCTest
@testable import NotchPilotCore

final class QuickMathTests: XCTestCase {
    func testEvaluatesCommonSums() {
        XCTAssertEqual(QuickMath.evaluate("18% of 2,450")!, 441, accuracy: 1e-9)
        XCTAssertEqual(QuickMath.evaluate("(12 + 8) * 3")!, 60, accuracy: 1e-9)
        XCTAssertEqual(QuickMath.evaluate("2^10")!, 1024, accuracy: 1e-9)
        XCTAssertEqual(QuickMath.evaluate("2^3^2")!, 512, accuracy: 1e-9)
        XCTAssertEqual(QuickMath.evaluate("= 10 / 4")!, 2.5, accuracy: 1e-9)
        XCTAssertEqual(QuickMath.evaluate("-3 + 5")!, 2, accuracy: 1e-9)
        XCTAssertEqual(QuickMath.evaluate("12 × 3 ÷ 4")!, 9, accuracy: 1e-9)
    }

    func testIgnoresTextThatIsNotASum() {
        XCTAssertNil(QuickMath.evaluate("Give me 25 minutes"))
        XCTAssertNil(QuickMath.evaluate("2025"))
        XCTAssertNil(QuickMath.evaluate("-7"))
        XCTAssertNil(QuickMath.evaluate("3 +"))
        XCTAssertNil(QuickMath.evaluate("(1 + 2"))
        XCTAssertNil(QuickMath.evaluate("1 / 0"))
        XCTAssertNil(QuickMath.evaluate(""))
    }

    func testFormatsForTheLocale() {
        XCTAssertEqual(QuickMath.format(1234.5, locale: Locale(identifier: "en_GB")), "1,234.5")
    }
}
