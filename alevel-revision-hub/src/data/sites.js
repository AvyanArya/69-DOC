/* Resource sites and link builders shared by every subject file. */
(function (RH) {
  'use strict';

  // Every external site the hub links to. `yt` is the YouTube handle used for
  // per-topic channel searches (opens that channel's search for the topic).
  RH.SITES = {
    gale:    { name: "Mr Gale's Resources", short: 'Mr Gale', url: 'https://www.mrgaleresources.com/maths-student/gcse-menu/a-level-menu', blurb: 'Chapter-by-chapter PowerPoints, crib sheets, video tutorials, question sheets with answers and past papers for A-level Maths and Further Maths.' },
    gill:    { name: 'Physics With Mr Gill', short: 'Mr Gill', url: 'https://www.youtube.com/@MrGillPhysics/playlists', yt: '@MrGillPhysics', blurb: 'A-level physics exam walkthroughs and "all of a topic in 30 minutes" chapter summaries.' },
    pmt:     { name: 'Physics & Maths Tutor', short: 'PMT', url: 'https://www.physicsandmathstutor.com/', blurb: 'Free notes, cheat sheets, flashcards, questions by topic and every past paper with mark schemes.' },
    mam:     { name: 'Mad Asmaths', short: 'MadAsMaths', url: 'https://madasmaths.com/', blurb: 'Huge free topic booklets with worked answers, plus the IYGB practice papers (harder than the real thing).' },
    fcm:     { name: '1st Class Maths', short: '1stClassMaths', url: 'https://www.1stclassmaths.com/alevelrevision', yt: '@1stClassMaths', blurb: 'Short, exam-focused video tutorials with matching question sheets and solutions.' },
    tlm:     { name: 'TLMaths', short: 'TLMaths', url: 'https://www.tlmaths.com/home/a-level-maths', yt: '@TLMaths', blurb: 'Complete video course for A-level Maths and Further Maths, topic by topic, plus paper walkthroughs.' },
    exs:     { name: 'ExamSolutions', short: 'ExamSolutions', url: 'https://www.examsolutions.net/a-level-maths/edexcel/', yt: '@ExamSolutions_Maths', blurb: 'Video tutorials and worked past-paper solutions mapped to the Edexcel papers.' },
    bicen:   { name: 'Bicen Maths', short: 'Bicen Maths', url: 'https://www.youtube.com/@BicenMaths', yt: '@BicenMaths', blurb: 'Edexcel Further Maths videos: Core Pure, FP1, FS1, FM1 and Decision.' },
    mgenie:  { name: 'Maths Genie', short: 'Maths Genie', url: 'https://www.mathsgenie.co.uk/', blurb: 'Edexcel A-level revision by topic and past papers.' },
    drfrost: { name: 'Dr Frost Maths', short: 'DrFrost', url: 'https://www.drfrost.org/', blurb: 'Free adaptive practice questions and slides for A-level and Further Maths.' },
    amsp:    { name: 'AMSP', short: 'AMSP', url: 'https://amsp.org.uk/resource/', blurb: 'Advanced Maths Support Programme: free Further Maths resources and enrichment.' },
    cog:     { name: 'Cognito', short: 'Cognito', url: 'https://cognito.org/courses/alevel/physics', yt: '@Cognitoedu', blurb: 'Free revision notes, quizzes, flashcards and exam questions, now covering A-level Edexcel Physics.' },
    sme:     { name: 'Save My Exams', short: 'SME', url: 'https://www.savemyexams.com/', blurb: 'Revision notes written for the Edexcel spec, topic questions and flashcards (some content needs an account).' },
    phyo:    { name: 'Physics Online', short: 'Physics Online', url: 'https://alevelphysicsonline.com/', yt: '@PhysicsOnline', blurb: 'Clear A-level Physics video lessons on every topic, with worked exam questions.' },
    isaac:   { name: 'Isaac Physics', short: 'Isaac Physics', url: 'https://isaacphysics.org/', blurb: 'Free problem-solving practice from the University of Cambridge. Great for stretching yourself.' },
    pk:      { name: 'Primrose Kitten', short: 'Primrose Kitten', url: 'https://www.youtube.com/@PrimroseKitten', yt: '@PrimroseKitten', blurb: 'Quick A-level science recap videos.' },
    econdal: { name: 'EconplusDal', short: 'EconplusDal', url: 'https://www.youtube.com/@EconplusDal', yt: '@EconplusDal', blurb: 'The go-to Edexcel Economics A channel: every spec point, diagrams, and essay technique.' },
    t2u:     { name: 'tutor2u', short: 'tutor2u', url: 'https://www.tutor2u.net/economics', yt: '@tutor2u', blurb: 'Study notes, revision videos, and model essays for A-level Economics.' },
    twot:    { name: 'Two Teachers', short: 'Two Teachers', url: 'https://www.youtube.com/@TwoTeachers', yt: '@TwoTeachers', blurb: 'Short economics explainers with diagrams and evaluation points.' },
    ehelp:   { name: 'Economics Help', short: 'Econ Help', url: 'https://www.economicshelp.org/', blurb: 'Plain-English articles on every topic with real UK examples and diagrams.' },
    eonline: { name: 'Economics Online', short: 'Econ Online', url: 'https://www.economicsonline.co.uk/', blurb: 'Topic explanations and diagrams for micro and macro.' },
    seneca:  { name: 'Seneca', short: 'Seneca', url: 'https://senecalearning.com/en-gb/', blurb: 'Free bite-sized revision courses with built-in recall quizzes.' },
    pearson: { name: 'Pearson Edexcel', short: 'Edexcel', url: 'https://qualifications.pearson.com/', blurb: 'The official specification, sample papers, formula booklets and examiner reports.' },
    ons:     { name: 'Office for National Statistics', short: 'ONS', url: 'https://www.ons.gov.uk/', blurb: 'Up-to-date UK data on GDP, inflation, unemployment and more for real-world examples.' },
    boe:     { name: 'Bank of England', short: 'BoE', url: 'https://www.bankofengland.co.uk/knowledgebank', blurb: 'Knowledge Bank explainers on interest rates, inflation and money.' }
  };

  // What kind of help a resource gives. Order here is the order on topic pages.
  RH.KINDS = {
    mine:  'My links',
    notes: 'Notes & cheat sheets',
    video: 'Video tutorials',
    qs:    'Practice & exam questions',
    cards: 'Flashcards & quizzes',
    papers:'Past & practice papers',
    other: 'More'
  };

  const PMT_DL = 'https://pmt.physicsandmathstutor.com/download/';
  const enc = (path) => path.split('/').map(encodeURIComponent).join('/');

  RH.link = {
    // A resource record: site key, kind, label, url.
    r: (s, k, t, u) => ({ s, k, t, u }),
    pmtFile: (path) => PMT_DL + enc(path),
    pmtPage: (path) => 'https://www.physicsandmathstutor.com/' + path,
    mam: (path) => 'https://madasmaths.com/archive/' + path,
    mamPage: (slug) => 'https://madasmaths.com/archive_' + slug + '.html',
    ytVideo: (id) => 'https://www.youtube.com/watch?v=' + id,
    ytSearch: (site, q) => {
      const handle = RH.SITES[site] && RH.SITES[site].yt;
      return 'https://www.youtube.com/' + handle + '/search?query=' + encodeURIComponent(q);
    },
    sme: (path) => 'https://www.savemyexams.com/a-level/' + path,
    cog: (path) => 'https://cognito.org/courses/alevel/' + path,
    search: (site, q) => {
      if (site === 'ehelp') return 'https://www.economicshelp.org/?s=' + encodeURIComponent(q);
      return '';
    }
  };
})(window.RH = window.RH || {});
