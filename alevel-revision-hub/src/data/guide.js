/* "How to revise" content: techniques, subject strategies and a year plan for 2026–27. */
(function (RH) {
  'use strict';

  RH.GUIDE = {
    phases: [
      { from: '2026-09-01', to: '2026-12-18', title: 'First pass', body: 'Rate every topic red, amber or green. Make condensed notes and flashcards for Year 1 content, and for Year 2 topics as you finish them in class. Do one set of topic questions per topic.' },
      { from: '2026-12-19', to: '2027-01-03', title: 'Christmas: mock prep', body: 'Cover everything taught so far. Sit your first timed papers in each subject and start a mistakes log.' },
      { from: '2027-01-04', to: '2027-02-28', title: 'Mocks, then fix the gaps', body: 'Add your mocks as tests on the Exams page. Afterwards, re-rate topics from your results and rebuild the plan with "Weakest first".' },
      { from: '2027-03-01', to: '2027-03-26', title: 'Exam practice', body: 'Finish Year 2 content. Do one timed past paper per subject per week and mark it strictly.' },
      { from: '2027-03-27', to: '2027-04-11', title: 'Easter: intensive', body: 'Two or three papers a day across subjects, plus topic repair. Use Mad Asmaths IYGB papers for stretch.' },
      { from: '2027-04-12', to: '2027-05-09', title: 'Final run-in', body: 'Switch the plan to "Exam countdown". Past papers in exam order, flashcards daily, physics core practicals and economics definitions.' },
      { from: '2027-05-10', to: '2027-06-21', title: 'Exam season', body: 'Follow the plan: exam-eve reviews, lighter exam days, and papers for the next exam. Rest properly between papers.' }
    ],

    techniques: [
      { title: 'Active recall', body: 'Test yourself instead of re-reading. Close the notes, write or say everything you know, then check.',
        how: ['Blurt a topic onto a blank page for 10 minutes, then fill the gaps in a different colour', 'Turn the key points on each topic page into questions', 'Use flashcards (PMT, Cognito, Save My Exams or your own) and sort them into "know" and "not yet" piles'] },
      { title: 'Spaced repetition', body: 'Come back to a topic after about 2, 5, 10, 21 and 35 days. Forgetting a little between reviews makes the memory last.',
        how: ['Keep "Spaced repetition" on in the planner', 'Press "Mark revised today" on a topic page so the hub knows when you last saw it', 'A 15-minute flashcard run counts as a review'] },
      { title: 'Interleaving', body: 'Mix subjects and topics within a day. It feels harder, and that is why it works: you practise choosing the right method.',
        how: ['Keep "Mix subjects within a day" on', 'In maths, do mixed exercises and full papers, not only one chapter at a time'] },
      { title: 'Past papers & mark schemes', body: 'The closest thing to the real exam. Do them timed, mark strictly, and learn the mark-scheme language.',
        how: ['Topic questions first, then full papers in the final 8 weeks before each exam', 'Log every paper on the Paper log page to see your trend', 'Read the examiner reports on the Pearson site for the most common mistakes'] },
      { title: 'Mistakes log', body: 'Write down every lost mark: the question, what you did, and the correct method. Redo those questions a week later.',
        how: ['Use the "My notes" box on each topic page as that topic\'s mistakes log', 'Read the logs for a paper the night before it'] },
      { title: 'Explain it simply', body: 'If you can explain a topic in plain words, you understand it. Where you get stuck is what to revise next.',
        how: ['Record a two-minute voice note explaining a topic', 'For economics, say the chain of reasoning out loud: because…, which means…, so…'] },
      { title: 'Focused sessions', body: 'Work in fixed blocks with short breaks, phone in another room.',
        how: ['Use the Focus timer for 25, 45 or 60 minutes', 'Decide exactly what you will do before starting the timer'] },
      { title: 'Sleep, exercise, food', body: 'Memories consolidate while you sleep, and a tired brain revises badly.',
        how: ['Aim for 8 hours, especially in exam season', 'Keep at least one evening a week free'] }
    ],

    subjects: {
      physics: ['Learn definitions word for word. PMT has a definitions list for every topic, and they are easy marks.',
        'Practise every derivation in the spec, such as orbital period and ½m⟨c²⟩ = 3/2 kT.',
        'Learn all 16 core practicals: method, the graph to plot, how the gradient gives the answer, and the uncertainties. Paper 3 tests them heavily.',
        'Use the data, formulae and relationships booklet when practising so you know what is given and what is not.',
        'Show units, significant figures and a clear method. Explanation questions lose the most marks, so use the key words from mark schemes.',
        'Paper 3 is synoptic: practise questions that link topics, like circular motion with magnetic fields.'],
      maths: ['Do questions, not notes. Read the cheat sheet, then go straight to questions.',
        'Work up in difficulty: textbook exercise, PMT questions by topic, Mad Asmaths booklets, then full papers.',
        'Do papers timed (2 hours) from about 8 weeks before Paper 1, with the formula booklet.',
        'Know the large data set for Paper 3: stations, years, variables and their quirks.',
        'Get quick on your calculator (distributions, tables, equation solving). TLMaths has how-to videos.',
        'IYGB practice papers on Mad Asmaths are harder than the real thing, which makes them good A* practice.'],
      further: ['Core Pure is half of the A-level. Prioritise complex numbers, matrices, series and calculus.',
        'Write proofs by induction out in full every time; the concluding sentence carries a mark.',
        'For your options, learn the standard methods and the wording of conclusions (for example, FS1 test conclusions in context).',
        'PMT has a cheat sheet and question set for every chapter. Do them all, then move to past papers.',
        'Further Maths leans on A-level Maths, so keep pure skills sharp with mixed practice.'],
      economics: ['Learn definitions exactly. Short questions reward precise wording, and PMT has definition lists and flashcards for each theme.',
        'Master the diagrams: draw each from memory with labelled axes, curves and shifts, until it takes under a minute.',
        'Use KAA + E in every long answer: Knowledge, Application, Analysis (chains of reasoning) and Evaluation.',
        'Plan 25-mark essays: two or three analysed points with diagrams, then evaluation (magnitude, time frame, stakeholders, assumptions) and a justified conclusion.',
        'Keep real examples ready: current UK inflation and Bank Rate (ONS, Bank of England), recent policies, firms and markets in the news.',
        'In data-response questions, quote the extract and its figures to earn application marks.']
    },

    planner: [
      ['Weak topics', 'Red and not-started topics score higher, amber a little, green least.'],
      ['Exam urgency', 'Topics in a paper that is coming soon score higher. Each topic is tied to the next paper it appears in.'],
      ['Cover untouched topics', 'Topics with no revision yet get a boost, so the whole syllabus is covered.'],
      ['Spaced repetition', 'A revised topic comes back after about 2, 5, 10, 21 and 35 days.'],
      ['Subject share', 'Sets how revision time is split between subjects. 2 means twice the time of a subject on 1; 0 leaves the subject out.'],
      ['Mix subjects within a day', 'On: consecutive sessions avoid the same subject. Off: each day focuses on one subject.'],
      ['Timed past papers', 'In the chosen number of weeks before each exam, full papers are booked on days with enough time, more often as the exam nears.'],
      ['Exam-eve review', 'The day before a paper becomes a light review of that paper\'s topics.'],
      ['Not taught yet', 'Topics you mark as not taught yet are left out until you clear the flag.']
    ]
  };
})(window.RH = window.RH || {});
