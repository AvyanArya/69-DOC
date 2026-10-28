/* Official Pearson Edexcel GCE Summer 2027 timetable (FINAL) for the four subjects.
   Morning papers start at 9:00am and afternoon papers at 1:30pm (UK centres). */
(function (RH) {
  'use strict';

  RH.EXAM_SOURCE = {
    label: 'Pearson Edexcel GCE Summer 2027 Examination Timetable (FINAL)',
    url: 'https://qualifications.pearson.com/content/dam/pdf/Support/Examination-timetables/gce-summer-2027-final.pdf'
  };
  RH.SESSION_TIMES = { AM: '09:00', PM: '13:30' };

  // [subject id, paper id, date, session]
  RH.OFFICIAL_EXAMS = [
    ['economics', 'p1',  '2027-05-10', 'AM'],
    ['further',   'p1',  '2027-05-12', 'PM'],
    ['economics', 'p2',  '2027-05-17', 'PM'],
    ['further',   'p2',  '2027-05-20', 'PM'],
    ['physics',   'p1',  '2027-05-21', 'AM'],
    ['further',   'p3c', '2027-05-25', 'PM'],
    ['maths',     'p1',  '2027-05-26', 'PM'],
    ['physics',   'p2',  '2027-05-27', 'PM'],
    ['economics', 'p3',  '2027-06-07', 'AM'],
    ['physics',   'p3',  '2027-06-08', 'AM'],
    ['maths',     'p2',  '2027-06-09', 'PM'],
    ['further',   'p3b', '2027-06-10', 'PM'],
    ['further',   'p3d', '2027-06-15', 'PM'],
    ['maths',     'p3',  '2027-06-16', 'PM'],
    ['further',   'p3a', '2027-06-18', 'PM'],
    ['further',   'p4a', '2027-06-21', 'PM'],
    ['further',   'p4b', '2027-06-21', 'PM'],
    ['further',   'p4c', '2027-06-21', 'PM'],
    ['further',   'p4d', '2027-06-21', 'PM']
  ].map(function (row) {
    return { id: row[0] + '-' + row[1], subject: row[0], paper: row[1], date: row[2], session: row[3], time: RH.SESSION_TIMES[row[3]] };
  });
})(window.RH = window.RH || {});
