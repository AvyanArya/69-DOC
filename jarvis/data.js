// =====================================================================
//  SAMPLE DATA. NOT REAL. FOR TESTING jarvis.html ONLY.
//  Replace this file with the real data.js from your daily briefing.
//  The dates move with your clock so the countdowns always have
//  something to show. All prices and portfolio numbers are made up.
// =====================================================================
(function () {
  function iso(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  function plus(n) { var d = new Date(today); d.setDate(d.getDate() + n); return iso(d); }
  function left(dateStr) {
    var p = dateStr.split("-");
    return Math.round((new Date(+p[0], +p[1] - 1, +p[2]) - today) / 86400000);
  }
  function dl(name, date, isNew, isChanged, details) {
    return { name: name, date: date, days_left: date ? left(date) : null, is_new: isNew, is_changed: isChanged, details: details };
  }

  window.JARVIS_DATA = {
    sample: true,
    date: iso(today),
    checked_at: "07:45 Dubai time (SAMPLE)",
    warnings: [
      "SAMPLE DATA: every number in this file is made up for testing. Replace data.js with your real daily briefing file.",
      "Beta was not available for TLT and IEF, so that field is null (this is here to show how N/A looks)."
    ],
    summary: "This is sample data for testing. You have two deadlines inside the next week: a practice task due in 2 days and the Trading Notes Analysis draft check-in in 6 days. The portfolio sits at $299,913.25, down 0.03% since the start, with Bucket 1 at 70.4% and Bucket 2 at 28.7%, so Bucket 1 is 3.6 points under its 74% target. Treasury yields rose again, with the 10-year at 5.12%, which pushed TLT down 1.12% today. Five picks are included: TLT and IEF for Bucket 1, and JPM, PEP and GOOGL for Bucket 2.",
    deadlines: [
      dl("SAMPLE: Team check-in with teacher", plus(2), true, false, "Sample deadline. Show your teacher the bucket split and first trades by 5:00 p.m. ET."),
      dl("SAMPLE: Trading Notes draft check-in", plus(6), false, true, "Sample deadline. Draft of the Trading Notes Analysis to be reviewed by the team captain (5:00 p.m. ET). Date moved earlier by two days."),
      dl("Official Team Roster Due", "2026-10-09", false, false, "October 9: Official team roster must be submitted as instructed (5:00 p.m. ET)."),
      dl("Trading Notes Analysis Due", "2026-10-23", false, false, "October 23: Trading Notes Analysis must be submitted as instructed (5:00 p.m. ET)."),
      dl("Investment Policy Statement (IPS) Due", "2026-11-06", false, false, "November 6: Investment Policy Statement (IPS) must be submitted as instructed (5:00 p.m. ET)."),
      dl("Final Report and School Documentation Due", "2026-12-04", false, false, "December 4: Final report and school documentation must be submitted as instructed (5:00 p.m. ET)."),
      dl("Semifinalists (Top 50 Teams) Announced", null, false, false, "Date not yet announced (TBD)."),
      dl("Learning Day & Global Finale (Wharton, Philadelphia)", "2027-04-29", false, false, "April 29 and 30, 2027 at the Wharton School, Philadelphia.")
    ],
    portfolio: {
      total_value: 299913.25,
      cash: 2870.15,
      total_return_pct: -0.03,
      daily_change_pct: -0.5,
      rank: 412,
      bucket1_pct: 70.4,
      bucket2_pct: 28.7,
      drift_warning: "SAMPLE: Bucket 1 is 3.6 points under its 74% target because TLT fell as yields rose. Consider topping up Treasuries.",
      holdings: [
        { ticker: "TLT", name: "iShares 20+ Year Treasury Bond ETF", bucket: 1, shares: 1600, avg_cost: 80.02, price: 78.85, value: 126160, weight_pct: 42.07, day_change_pct: -1.12, gain_pct: -1.46 },
        { ticker: "IEF", name: "iShares 7-10 Year Treasury Bond ETF", bucket: 1, shares: 950, avg_cost: 90.10, price: 89.31, value: 84844.5, weight_pct: 28.29, day_change_pct: -0.46, gain_pct: -0.88 },
        { ticker: "GOOGL", name: "Alphabet Inc. (Class A)", bucket: 2, shares: 80, avg_cost: 338.90, price: 346.12, value: 27689.6, weight_pct: 9.23, day_change_pct: 0.84, gain_pct: 2.13 },
        { ticker: "JPM", name: "JPMorgan Chase & Co.", bucket: 2, shares: 68, avg_cost: 335.40, price: 341.05, value: 23191.4, weight_pct: 7.73, day_change_pct: 0.37, gain_pct: 1.68 },
        { ticker: "PEP", name: "PepsiCo, Inc.", bucket: 2, shares: 140, avg_cost: 127.60, price: 127.44, value: 17841.6, weight_pct: 5.95, day_change_pct: -0.21, gain_pct: -0.13 },
        { ticker: "VT", name: "Vanguard Total World Stock ETF", bucket: 2, shares: 130, avg_cost: 131.75, price: 133.20, value: 17316, weight_pct: 5.77, day_change_pct: 0.18, gain_pct: 1.10 }
      ],
      recent_trades: [
        { date: plus(-1), action: "BUY", ticker: "VT", shares: 130, price: 131.75 },
        { date: plus(-1), action: "BUY", ticker: "PEP", shares: 140, price: 127.60 },
        { date: plus(-2), action: "BUY", ticker: "TLT", shares: 1600, price: 80.02 }
      ]
    },
    market: {
      indices: [
        { name: "S&P 500", value: 7688.40, change_pct: -0.21 },
        { name: "Nasdaq Composite", value: 26910.12, change_pct: 0.12 },
        { name: "FTSE 100", value: 10702.55, change_pct: 0.22 },
        { name: "US 10-Year Treasury Yield", value: 5.12, change_pct: 0.59 },
        { name: "US 30-Year Treasury Yield", value: 5.37, change_pct: 0.75 },
        { name: "Crude Oil (WTI)", value: 92.10, change_pct: -1.65 },
        { name: "Gold", value: null, change_pct: null }
      ],
      news: [
        {
          headline: "SAMPLE: Treasury yields climb for a third day",
          summary: "Made-up headline for testing. Long-dated yields rose again after a weak bond auction.",
          why_it_matters: "Higher yields lower the price of the Treasury ETFs in Bucket 1, but raise the income new purchases can lock in for the 2033 to 2042 payments."
        },
        {
          headline: "SAMPLE: Oil slips as supply fears ease",
          summary: "Made-up headline for testing. Crude fell 1.65% as tensions cooled.",
          why_it_matters: "Lower energy costs ease inflation pressure, which is mildly good for both buckets."
        }
      ],
      events: [
        "SAMPLE: Fed speakers on Tuesday and Thursday could move yields.",
        "SAMPLE: Nike and Costco earnings this week.",
        "SAMPLE: Next FOMC meeting is October 27 to 28, 2026."
      ]
    },
    picks: [
      {
        ticker: "TLT", name: "iShares 20+ Year Treasury Bond ETF", price: 78.85,
        pe: null, forward_pe: null, sector_pe: null, peg: null, dividend_yield: 4.93,
        debt_to_equity: null, revenue_growth_pct: null, beta: null, bucket: 1,
        why_bucket: "Bucket 1: long-duration Treasury ETF to match the later payment years.",
        bull: ["SAMPLE: yield of 4.93% locks in strong income.", "SAMPLE: long duration fits the 2038 to 2042 payments."],
        bear: ["SAMPLE: price falls further if yields keep rising.", "SAMPLE: an ETF never matures, unlike a single bond."],
        report_paragraph: "SAMPLE PARAGRAPH. TLT trades at $78.85 with a 4.93% dividend yield. Its long duration lines up with the later years of the 2033 to 2042 payment schedule."
      },
      {
        ticker: "IEF", name: "iShares 7-10 Year Treasury Bond ETF", price: 89.31,
        pe: null, forward_pe: null, sector_pe: null, peg: null, dividend_yield: 4.15,
        debt_to_equity: null, revenue_growth_pct: null, beta: null, bucket: 1,
        why_bucket: "Bucket 1: medium-duration Treasury ETF for the earlier payment years.",
        bull: ["SAMPLE: less price swing than TLT.", "SAMPLE: good for laddering the 2033 to 2036 payments."],
        bear: ["SAMPLE: lower yield than TLT at 4.15%."],
        report_paragraph: "SAMPLE PARAGRAPH. IEF trades at $89.31 and yields 4.15%, with less rate sensitivity than TLT."
      },
      {
        ticker: "JPM", name: "JPMorgan Chase & Co.", price: 341.05,
        pe: 14.62, forward_pe: 14.01, sector_pe: 14.55, peg: 1.40, dividend_yield: 1.94,
        debt_to_equity: null, revenue_growth_pct: 13.8, beta: 0.98, bucket: 2,
        why_bucket: "Bucket 2: fairly valued bank that benefits from higher rates.",
        bull: ["SAMPLE: P/E of 14.62 is right at the sector's 14.55.", "SAMPLE: higher rates widen lending margins."],
        bear: ["SAMPLE: beta of 0.98 means limited extra upside."],
        report_paragraph: "SAMPLE PARAGRAPH. JPMorgan trades at $341.05 with a P/E of 14.62 against a sector average of 14.55."
      },
      {
        ticker: "PEP", name: "PepsiCo, Inc.", price: 127.44,
        pe: 16.70, forward_pe: 14.65, sector_pe: 24.29, peg: 2.90, dividend_yield: 4.64,
        debt_to_equity: 2.39, revenue_growth_pct: 5.6, beta: 0.36, bucket: 2,
        why_bucket: "Bucket 2: low-beta stabiliser inside the growth sleeve.",
        bull: ["SAMPLE: P/E of 16.70 well below the sector's 24.29.", "SAMPLE: 4.64% dividend yield."],
        bear: ["SAMPLE: PEG of 2.90 looks expensive for its growth.", "SAMPLE: debt to equity of 2.39."],
        report_paragraph: "SAMPLE PARAGRAPH. PepsiCo trades at $127.44 with a P/E of 16.70, below the beverage sector's 24.29, and yields 4.64%."
      },
      {
        ticker: "GOOGL", name: "Alphabet Inc. (Class A)", price: 346.12,
        pe: 17.35, forward_pe: 25.70, sector_pe: 19.91, peg: 2.01, dividend_yield: 0.26,
        debt_to_equity: 0.19, revenue_growth_pct: 20.1, beta: 1.22, bucket: 2,
        why_bucket: "Bucket 2: higher-growth tech for real upside toward the facility.",
        bull: ["SAMPLE: revenue up 20.1%.", "SAMPLE: debt to equity only 0.19."],
        bear: ["SAMPLE: beta of 1.22 means bigger swings.", "SAMPLE: forward P/E of 25.70 is above trailing."],
        report_paragraph: "SAMPLE PARAGRAPH. Alphabet trades at $346.12 with a P/E of 17.35 against a sector average of 19.91, and revenue grew 20.1%."
      }
    ],
    study: {
      topic: "SAMPLE: Duration in one minute",
      explanation: "Sample study card. Duration tells you roughly how much a bond's price moves when yields move. A duration of 15 means about a 15% price drop if yields rise by 1 percentage point. Matching duration to when each payment is due is how Bucket 1 protects Laura's fixed payments."
    }
  };
})();
