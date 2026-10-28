/* Pearson Edexcel A-level Further Mathematics (9FM0).
   Core Pure 1 & 2 are compulsory. Papers 3 and 4 are options: you sit two of the eight option modules. */
(function (RH) {
  'use strict';
  const L = RH.link, r = L.r;

  const AREA = { cp: 'Core-Pure', fp: 'Additional-Pure', fs: 'Statistics', fm: 'Mechanics' };
  // PMT cheat sheet + question set for one chapter. tq overrides the question file name where PMT spells it differently.
  function pmt(mod, ch, tq) {
    const area = AREA[mod.slice(0, 2)];
    const base = 'Maths/A-level/Further/' + area + '/Edexcel/' + mod.toUpperCase() + '/';
    const short = ch.replace(/^Ch\.\d+ /, '');
    return [
      r('pmt', 'notes', 'PMT cheat sheet: ' + short, L.pmtFile(base + 'Cheat-Sheets/' + ch + '.pdf')),
      r('pmt', 'qs', 'PMT exam questions: ' + short, L.pmtFile(base + 'Topic-Qs/Set-A/' + (tq || ch) + '.pdf'))
    ];
  }
  const mam = (path, label) => r('mam', 'qs', 'Mad Asmaths: ' + label, L.mam('maths_booklets/' + path + '.pdf'));
  const iygb = (code, label) => r('mam', 'papers', 'IYGB practice papers: ' + label, L.mamPage('iygb_practice_papers_' + code + '_practice_papers'));
  const sme = (mod, label) => r('sme', 'notes', 'Save My Exams: ' + label + ' notes & questions', L.sme('further-maths/edexcel/17/' + mod + '/'));
  const formula = (mod) => r('pmt', 'notes', mod.toUpperCase() + ' formula sheet (PMT)', L.pmtFile('Maths/A-level/Further/' + AREA[mod.slice(0, 2)] + '/Edexcel/' + mod.toUpperCase() + '/' + mod.toUpperCase() + ' A-level Formula Sheet.pdf'));

  // PMT file names are title case with small words kept lower case ("Roots of Polynomials").
  const SMALL = { of: 1, and: 1, in: 1, the: 1, by: 1, with: 1, to: 1, a: 1, for: 1 };
  const titleCase = (s) => s.split(' ').map((w, i) => (i && SMALL[w]) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // Build a topic list from rows of
  // [id, name, video query, points, extra resources, PMT chapter name (false = none on PMT), PMT question-file override].
  const T = (mod, rows) => rows.map(function (row, i) {
    const pmtRes = row[5] === false ? [] : pmt(mod, 'Ch.' + (i + 1) + ' ' + (row[5] || titleCase(row[1])), row[6]);
    return { id: row[0], name: (i + 1) + '. ' + row[1], q: row[2], pts: row[3], res: pmtRes.concat(row[4] || []) };
  });

  RH.FM_OPTIONS = [
    { id: 'fp1', paper: 'p3a', name: 'Further Pure 1' },
    { id: 'fs1', paper: 'p3b', name: 'Further Statistics 1' },
    { id: 'fm1', paper: 'p3c', name: 'Further Mechanics 1' },
    { id: 'd1',  paper: 'p3d', name: 'Decision Maths 1' },
    { id: 'fp2', paper: 'p4a', name: 'Further Pure 2' },
    { id: 'fs2', paper: 'p4b', name: 'Further Statistics 2' },
    { id: 'fm2', paper: 'p4c', name: 'Further Mechanics 2' },
    { id: 'd2',  paper: 'p4d', name: 'Decision Maths 2' }
  ];

  const opt = (code, id, name, what) => ({ id: id, code: '9FM0/' + code, name: 'Paper ' + code + ': ' + name, dur: 90, marks: 75, weight: '25%', what: what, option: true });

  RH.SUBJECT_LIST = RH.SUBJECT_LIST || [];
  RH.SUBJECT_LIST.push({
    id: 'further', short: 'fm', name: 'Further Maths', board: 'Pearson Edexcel', spec: '9FM0',
    video: ['bicen', 'tlm', 'exs'],
    papers: [
      { id: 'p1', code: '9FM0/01', name: 'Paper 1: Core Pure Mathematics 1', dur: 90, marks: 75, weight: '25%', what: 'Any Core Pure content (CP1 and CP2 books).' },
      { id: 'p2', code: '9FM0/02', name: 'Paper 2: Core Pure Mathematics 2', dur: 90, marks: 75, weight: '25%', what: 'Any Core Pure content (CP1 and CP2 books).' },
      opt('3A', 'p3a', 'Further Pure Mathematics 1', 'Option module FP1.'),
      opt('3B', 'p3b', 'Further Statistics 1', 'Option module FS1.'),
      opt('3C', 'p3c', 'Further Mechanics 1', 'Option module FM1.'),
      opt('3D', 'p3d', 'Decision Mathematics 1', 'Option module D1.'),
      opt('4A', 'p4a', 'Further Pure Mathematics 2', 'Option module FP2.'),
      opt('4B', 'p4b', 'Further Statistics 2', 'Option module FS2.'),
      opt('4C', 'p4c', 'Further Mechanics 2', 'Option module FM2.'),
      opt('4D', 'p4d', 'Decision Mathematics 2', 'Option module D2.')
    ],
    res: [
      r('pmt', 'notes', 'PMT Further Maths: Core Pure', L.pmtPage('maths-revision/further-core-pure/')),
      r('pmt', 'notes', 'PMT Further Maths: Further Pure (FP1/FP2)', L.pmtPage('maths-revision/further-additional-pure/')),
      r('pmt', 'notes', 'PMT Further Maths: Statistics (FS1/FS2)', L.pmtPage('maths-revision/further-statistics/')),
      r('pmt', 'notes', 'PMT Further Maths: Mechanics (FM1/FM2)', L.pmtPage('maths-revision/further-mechanics/')),
      r('pmt', 'papers', 'PMT Further Maths past papers', L.pmtPage('maths-revision/a-level-edexcel/papers-further/')),
      r('mam', 'qs', 'Mad Asmaths further topic booklets', L.mamPage('maths_booklets_further_topics_various')),
      r('mam', 'qs', 'Mad Asmaths further integration & DEs', L.mamPage('maths_booklets_further_topics_integration')),
      r('mam', 'qs', 'Mad Asmaths matrices & vectors', L.mamPage('maths_booklets_further_topics_linear_algebra')),
      r('mam', 'papers', 'IYGB synoptic further papers (SYNF)', L.mamPage('iygb_practice_papers_synf_practice_papers')),
      r('bicen', 'video', 'Bicen Maths: Edexcel Further Maths videos', 'https://www.youtube.com/@BicenMaths/playlists'),
      r('tlm', 'video', 'TLMaths Further Maths (Pure)', 'https://www.tlmaths.com/home/a-level-further-maths/pure'),
      r('sme', 'notes', 'Save My Exams: Core Pure', L.sme('further-maths/edexcel/17/core-pure/')),
      r('amsp', 'other', 'AMSP Further Maths resources', 'https://amsp.org.uk/resource/'),
      r('pearson', 'other', 'Specification & formula booklet', 'https://qualifications.pearson.com/en/qualifications/edexcel-a-levels/further-mathematics-2017.html')
    ],
    comps: [
      { id: 'cp1', name: 'Core Pure 1', papers: ['p1', 'p2'],
        res: [sme('core-pure', 'Core Pure')],
        topics: T('cp1', [
          ['complex', 'Complex numbers', 'complex numbers', ['Add, multiply and divide complex numbers', 'Use the complex conjugate', 'Solve quadratics with complex roots', 'Solve cubics and quartics with real coefficients (conjugate pairs)'], [mam('further_topics/various/complex_numbers_part_1', 'Complex numbers part 1')]],
          ['argand', 'Argand diagrams', 'Argand diagram modulus argument loci', ['Plot complex numbers on an Argand diagram', 'Use modulus–argument form r(cos θ + i sin θ)', 'Multiply and divide in modulus–argument form', 'Sketch loci and regions: |z − a| = r, arg(z − a) = θ, |z − a| = |z − b|'], [mam('further_topics/various/complex_numbers_part_1_exam_questions', 'Complex numbers exam questions')]],
          ['series', 'Series', 'series sum of r squared', ['Use standard results for Σr, Σr² and Σr³', 'Sum series by splitting and using standard results', 'Handle sums from r = k to n'], [mam('further_topics/various/series_summation_practice', 'Series summation')]],
          ['roots', 'Roots of polynomials', 'roots of polynomials', ['Relate roots and coefficients for quadratics, cubics and quartics', 'Find expressions in the roots (e.g. Σα², Σ1/α)', 'Find equations with transformed roots'], [mam('further_topics/various/roots_of_polynomial_equations', 'Roots of polynomials')]],
          ['volumes', 'Volumes of revolution', 'volumes of revolution', ['Find volumes rotating about the x-axis', 'Find volumes rotating about the y-axis', 'Model real objects as solids of revolution'], [mam('standard_topics/integration/integration_volume_of_revolution', 'Volumes of revolution')]],
          ['matrices', 'Matrices', 'matrices determinant inverse', ['Add, subtract and multiply matrices', 'Find determinants of 2×2 and 3×3 matrices', 'Find inverses and identify singular matrices', 'Solve systems of equations and interpret them geometrically (planes)'], [mam('further_topics/linear_algebra/matrices_practice', 'Matrices practice'), mam('further_topics/linear_algebra/consistency_of_equations', 'Consistency of equations')]],
          ['transform', 'Linear transformations', 'matrix transformations invariant lines', ['Represent 2D and 3D transformations with matrices', 'Combine transformations', 'Use the determinant as an area/volume scale factor', 'Find invariant points and invariant lines'], [mam('further_topics/linear_algebra/matrices_exam_questions_part_a', 'Matrices exam questions A')]],
          ['induction', 'Proof by induction', 'proof by induction', ['Prove summation results by induction', 'Prove divisibility results', 'Prove results for powers of matrices', 'Write the full conclusion statement'], [mam('further_topics/various/proof_by_induction', 'Proof by induction')]],
          ['vectors', 'Vectors', 'vector equation of a plane', ['Write equations of lines in vector and Cartesian form', 'Write equations of planes (vector, scalar product and Cartesian)', 'Find angles between lines and planes', 'Find intersections and perpendicular distances'], [mam('further_topics/linear_algebra/vectors_practice_part_b', 'Vectors practice'), mam('further_topics/linear_algebra/vectors_exam_questions_part_b', 'Vectors exam questions')]]
        ]) },

      { id: 'cp2', name: 'Core Pure 2', papers: ['p1', 'p2'],
        res: [sme('core-pure', 'Core Pure')],
        topics: T('cp2', [
          ['complex', 'Complex numbers', "de Moivre's theorem roots of unity", ['Use exponential form re^(iθ)', "Prove and use de Moivre's theorem", 'Derive trig identities (multiple angles, powers)', 'Sum series using complex numbers', 'Find nth roots and roots of unity'], [mam('further_topics/various/complex_numbers_part_2', 'Complex numbers part 2'), mam('further_topics/various/complex_numbers_part_2_exam_questions', 'Complex numbers part 2 exam questions')]],
          ['series', 'Series', 'method of differences Maclaurin series', ['Sum series with the method of differences', 'Find Maclaurin series from first principles', 'Use standard series and combine them'], [mam('further_topics/various/series_expansions', 'Series expansions')]],
          ['calculus', 'Methods in calculus', 'improper integrals mean value inverse trig', ['Evaluate improper integrals', 'Find the mean value of a function', 'Differentiate and integrate inverse trig functions', 'Integrate using partial fractions'], [mam('further_topics/integration/improper_integrals', 'Improper integrals'), mam('further_topics/integration/integration_definite_megamix', 'Definite integration mix')]],
          ['volumes', 'Volumes of revolution', 'volumes of revolution parametric', ['Find volumes for curves given parametrically', 'Find volumes of composite solids', 'Model with volumes of revolution'], [mam('standard_topics/integration/integration_volume_of_revolution', 'Volumes of revolution')]],
          ['polar', 'Polar coordinates', 'polar coordinates area', ['Convert between polar and Cartesian forms', 'Sketch polar curves', 'Find areas enclosed by polar curves', 'Find tangents parallel or perpendicular to the initial line'], [mam('further_topics/various/polar_coordinates_practice', 'Polar coordinates practice'), mam('further_topics/various/polar_coordinates_exam_questions', 'Polar exam questions')]],
          ['hyperbolic', 'Hyperbolic functions', 'hyperbolic functions', ['Define sinh, cosh and tanh and sketch them', 'Use inverse hyperbolic functions in log form', 'Prove and use hyperbolic identities', 'Differentiate and integrate hyperbolic functions'], [mam('further_topics/various/hyperbolic_functions', 'Hyperbolic functions')]],
          ['de', 'Methods in differential equations', 'integrating factor second order differential equations', ['Solve first-order equations with an integrating factor', 'Solve second-order homogeneous equations (auxiliary equation)', 'Find particular integrals for non-homogeneous equations', 'Use boundary conditions'], [mam('further_topics/integration/1st_order_differential_equations_practice', '1st-order DEs'), mam('further_topics/integration/2nd_order_differential_equations_practice', '2nd-order DEs')]],
          ['modelling', 'Modelling with differential equations', 'simple harmonic motion damped oscillations differential equations', ['Model simple harmonic motion', 'Model damped and forced oscillations', 'Solve coupled first-order systems (e.g. predator–prey)', 'Interpret and criticise models'], [mam('further_topics/integration/2nd_order_differential_equations_exam_questions', '2nd-order DE exam questions')]]
        ]) },

      { id: 'fp1', option: 'fp1', name: 'Further Pure 1 (option)', papers: ['p3a'],
        res: [formula('fp1'), iygb('fp1', 'FP1'), sme('further-pure-1', 'Further Pure 1')],
        topics: T('fp1', [
          ['vectors', 'Vectors', 'vector product scalar triple product', ['Use the vector product a × b', 'Find areas of triangles and parallelograms', 'Use the scalar triple product for volumes of parallelepipeds and tetrahedra', 'Use the r × a = b form of a line'], [mam('further_topics/linear_algebra/vectors_exam_questions_part_b', 'Vectors exam questions')]],
          ['conics1', 'Conic sections 1', 'parabola rectangular hyperbola', ['Use parametric and Cartesian forms of the parabola and rectangular hyperbola', 'Find focus and directrix of a parabola', 'Find tangents and normals'], [mam('further_topics/various/conic_sections', 'Conic sections')]],
          ['conics2', 'Conic sections 2', 'ellipse hyperbola eccentricity', ['Use equations of the ellipse and hyperbola', 'Find eccentricity, foci and directrices', 'Find tangents and normals', 'Solve loci problems'], [mam('further_topics/various/conic_sections', 'Conic sections')]],
          ['ineq', 'Inequalities', 'inequalities rational functions modulus', ['Solve inequalities with rational functions', 'Solve inequalities with modulus signs', 'Use graphs to support algebraic solutions'], [mam('standard_topics/various/inequalities', 'Inequalities')]],
          ['tform', 'The t-formulae', 't formulae tan half angle', ['Use t = tan(x/2) to write sin x, cos x and tan x', 'Prove identities with t-formulae', 'Solve trig equations with t-formulae'], [], 'The t-Formulae'],
          ['taylor', 'Taylor series', 'Taylor series', ['Find Taylor series about x = a', 'Use series to evaluate limits', 'Find series solutions of differential equations'], [mam('further_topics/various/series_expansions', 'Series expansions')]],
          ['calc', 'Methods in calculus', "Leibniz theorem L'Hopital's rule", ["Use Leibniz's theorem for nth derivatives of products", "Use L'Hôpital's rule for limits", 'Use the Weierstrass substitution to integrate'], []],
          ['numerical', 'Numerical methods', "Euler's method Simpson's rule", ["Solve differential equations step by step with Euler's method", 'Use the midpoint method', "Use Simpson's rule to estimate integrals"], [mam('further_topics/integration/differential_equations_numerical_methods', 'Numerical methods for DEs')]],
          ['reducible', 'Reducible differential equations', 'differential equations substitution', ['Use a given substitution to reduce a first-order DE', 'Use a substitution to reduce a second-order DE to constant coefficients', 'Solve and convert back to the original variables'], [mam('further_topics/integration/1st_order_differential_equations_substitutions', '1st-order substitutions'), mam('further_topics/integration/2nd_order_differential_equations_substitutions', '2nd-order substitutions')]]
        ]) },

      { id: 'fs1', option: 'fs1', name: 'Further Statistics 1 (option)', papers: ['p3b'],
        res: [formula('fs1'), iygb('fs1', 'FS1'), sme('further-statistics-1', 'Further Statistics 1')],
        topics: T('fs1', [
          ['drv', 'Discrete random variables', 'discrete random variables expectation variance', ['Find E(X) and Var(X)', 'Find E(g(X))', 'Use E(aX + b) and Var(aX + b)'], [mam('statistics/discrete_random_variables', 'Discrete random variables')]],
          ['poisson', 'Poisson distribution', 'Poisson distribution', ['Know the conditions for a Poisson model', 'Calculate Poisson probabilities', 'Use mean = variance = λ', 'Add independent Poisson variables', 'Approximate a binomial with a Poisson'], [mam('statistics/poisson_distribution', 'Poisson distribution')], 'Poisson Distributions'],
          ['geo', 'Geometric & negative binomial distributions', 'geometric distribution negative binomial', ['Use Geo(p) and its mean and variance', 'Use the negative binomial distribution', 'Choose the right model from context'], [mam('statistics/geometric_distribution', 'Geometric distribution')], 'Geometric and NB Distributions'],
          ['hyp', 'Hypothesis testing', 'hypothesis testing Poisson', ['Carry out tests for Poisson and geometric parameters', 'Find critical regions and actual significance levels', 'State conclusions in context'], [mam('statistics/hypothesis_testing_introduction', 'Hypothesis testing')]],
          ['clt', 'Central limit theorem', 'central limit theorem', ['State the central limit theorem', 'Use the distribution of the sample mean', 'Apply it to non-normal populations'], [mam('statistics/probability_sampling_distributions', 'Sampling distributions')]],
          ['chi', 'Chi-squared tests', 'chi squared goodness of fit contingency table', ['Carry out goodness-of-fit tests for given distributions', 'Use contingency tables to test independence', 'Find degrees of freedom and combine small expected frequencies'], [mam('statistics/goodness_of_fit', 'Goodness of fit'), mam('statistics/contingency_tables', 'Contingency tables')], 'Chi-Squared Tests'],
          ['pgf', 'Probability generating functions', 'probability generating functions', ['Find PGFs of standard distributions', 'Find mean and variance from a PGF', 'Use PGFs of sums of independent variables'], []],
          ['quality', 'Quality of tests', 'type I type II errors power of a test', ['Find the size of a test (Type I error probability)', 'Find Type II error probabilities', 'Find and interpret the power and power function of a test'], []]
        ]) },

      { id: 'fm1', option: 'fm1', name: 'Further Mechanics 1 (option)', papers: ['p3c'],
        res: [iygb('fm1', 'FM1'), sme('further-mechanics-1', 'Further Mechanics 1')],
        topics: T('fm1', [
          ['impulse', 'Momentum & impulse', 'momentum impulse further mechanics', ['Use impulse = change in momentum, in 1D and as vectors', 'Apply conservation of momentum', 'Solve problems with jerks in strings'], [mam('mechanics/m2_m3_impulse', 'Impulse'), mam('mechanics/m1_collisions', 'Collisions')], 'Momentum and Impulse'],
          ['wep', 'Work, energy & power', 'work energy power', ['Use the work–energy principle', 'Include work done against resistance', 'Use P = Fv for vehicles'], [mam('mechanics/m2_work_and_energy', 'Work and energy'), mam('mechanics/m2_power', 'Power')], 'Work, Energy and Power'],
          ['elastic', 'Elastic strings & springs', 'elastic strings springs Hooke', ['Use Hooke\'s law T = λx/l', 'Use elastic potential energy λx²/2l', 'Solve energy problems with strings and springs'], [mam('mechanics/m2_m3_elastic_strings_springs', 'Elastic strings & springs')], 'Elastic Strings and Springs'],
          ['col1d', 'Elastic collisions in 1D', "Newton's law of restitution", ["Use Newton's law of restitution with e", 'Find loss of kinetic energy', 'Solve successive collisions and collisions with walls'], [mam('mechanics/m2_collisions', 'Collisions')], 'Elastic Collisions in 1D'],
          ['col2d', 'Elastic collisions in 2D', 'oblique collisions', ['Solve oblique impacts with a smooth plane', 'Solve oblique collisions between smooth spheres', 'Find angles of deflection and KE loss'], [mam('mechanics/m3_m4_oblique_collisions', 'Oblique collisions')], 'Elastic Collisions in 2D']
        ]) },

      { id: 'd1', option: 'd1', name: 'Decision Maths 1 (option)', papers: ['p3d'],
        res: [sme('decision-1', 'Decision 1'), r('bicen', 'video', 'Bicen Maths: Decision playlists', 'https://www.youtube.com/@BicenMaths/playlists')],
        topics: T('d1', [
          ['alg', 'Algorithms', 'bubble sort quick sort bin packing', ['Follow flow charts and written algorithms', 'Use bubble sort and quick sort', 'Use first-fit, first-fit decreasing and full-bin packing', 'Find the order of an algorithm'], [], false],
          ['graphs', 'Graphs & networks', 'graphs and networks decision maths', ['Use graph vocabulary: vertex, edge, degree, path, cycle, tree', 'Identify Eulerian and semi-Eulerian graphs', 'Use adjacency and distance matrices', 'Use the planarity algorithm'], [], false],
          ['grapalg', 'Algorithms on graphs', "Kruskal Prim Dijkstra Floyd", ["Use Kruskal's and Prim's algorithms (including matrix form)", "Use Dijkstra's algorithm for shortest paths", "Use Floyd's algorithm"], [], false],
          ['route', 'Route inspection', 'route inspection Chinese postman', ['Identify odd vertices', 'Pair odd vertices to minimise extra distance', 'Adapt when start and finish differ'], [], false],
          ['tsp', 'The travelling salesman problem', 'travelling salesman problem', ['Tell the classical problem from the practical one', 'Find upper bounds (nearest neighbour, MST method)', 'Find lower bounds with the deleted-vertex method'], [], false],
          ['lp', 'Linear programming', 'linear programming graphical', ['Formulate LP problems', 'Solve graphically with the objective line or vertex method', 'Find integer solutions'], [], false],
          ['simplex', 'The simplex algorithm', 'simplex algorithm', ['Add slack variables and set up a tableau', 'Choose pivots and iterate to the optimum', 'Use two-stage simplex and the big-M method'], [], false],
          ['cpa', 'Critical path analysis', 'critical path analysis', ['Draw activity networks with dummies', 'Find early and late times, critical activities and float', 'Draw Gantt charts and resource histograms', 'Schedule activities with limited workers'], [], false]
        ]) },

      { id: 'fp2', option: 'fp2', name: 'Further Pure 2 (option)', papers: ['p4a'],
        res: [formula('fp2'), iygb('fp2', 'FP2')],
        topics: T('fp2', [
          ['number', 'Number theory', 'number theory modular arithmetic', ["Use Euclid's algorithm and Bézout's identity", 'Use modular arithmetic and divisibility tests', "Use Fermat's little theorem", 'Solve counting problems'], [mam('further_topics/various/number_theory', 'Number theory')]],
          ['groups', 'Groups', 'group theory Lagrange', ['Check the group axioms', 'Use Cayley tables and find orders of elements', 'Find subgroups and use Lagrange\'s theorem', 'Identify cyclic groups and isomorphisms'], [mam('further_topics/various/groups_and_relations', 'Groups')]],
          ['complex', 'Complex numbers', 'complex loci transformations', ['Sketch loci such as |z − a| = k|z − b|', 'Shade regions in the Argand diagram', 'Map loci under transformations w = f(z)'], [mam('further_topics/various/complex_numbers_part_2', 'Complex numbers part 2')]],
          ['recurrence', 'Recurrence relations', 'recurrence relations', ['Solve first-order linear recurrence relations', 'Solve second-order linear recurrence relations', 'Model with recurrence relations and prove closed forms by induction'], [mam('basic_topics/various/recurrence_relations', 'Recurrence relations')]],
          ['matrix', 'Matrix algebra', 'eigenvalues eigenvectors diagonalisation', ['Find eigenvalues and eigenvectors', 'Diagonalise matrices (including symmetric ones)', 'Use the Cayley–Hamilton theorem'], [mam('further_topics/linear_algebra/matrices_exam_questions_part_b', 'Matrices exam questions B')]],
          ['integration', 'Integration techniques', 'reduction formulae arc length', ['Derive and use reduction formulae', 'Find arc lengths', 'Find surface areas of revolution'], [mam('further_topics/integration/reduction_formulas', 'Reduction formulae'), mam('further_topics/integration/arclength_surface_of_revolution', 'Arc length & surface area')]]
        ]) },

      { id: 'fs2', option: 'fs2', name: 'Further Statistics 2 (option)', papers: ['p4b'],
        res: [formula('fs2'), iygb('fs2', 'FS2')],
        topics: T('fs2', [
          ['regression', 'Linear regression', 'least squares regression residuals', ['Find least-squares regression lines', 'Use residuals and the residual sum of squares', 'Interpret regression in context'], [mam('statistics/correlation_and_regression', 'Correlation & regression')]],
          ['correlation', 'Correlation', "Spearman's rank PMCC hypothesis test", ['Calculate and interpret the PMCC', "Calculate Spearman's rank correlation", 'Test for correlation using critical values'], [mam('statistics/correlation_and_regression', 'Correlation & regression')]],
          ['continuous', 'Continuous distributions', 'probability density function', ['Use probability density functions', 'Find and use cumulative distribution functions', 'Find mean, variance, median, mode and quartiles', 'Use the continuous uniform distribution'], [mam('statistics/probability_density_functions', 'PDFs'), mam('statistics/rectangular_distribution', 'Continuous uniform')]],
          ['combinations', 'Combinations of random variables', 'linear combinations normal random variables', ['Find mean and variance of aX ± bY', 'Use linear combinations of independent normal variables'], [mam('statistics/normal_variables', 'Normal variables'), mam('statistics/related_random_variables', 'Related random variables')], 'Combinations of Random Variables'],
          ['ci', 'Estimation, confidence intervals & normal tests', 'confidence intervals unbiased estimators', ['Use unbiased estimators for mean and variance', 'Find standard errors', 'Find confidence intervals for a mean', 'Test differences of means'], [mam('statistics/hypothesis_testing_normal_distribution', 'Normal hypothesis tests')], 'Estimation, Confidence Intervals and Tests Using Normal Distribution'],
          ['further', 'Further hypothesis tests', 'chi squared test for variance F test', ['Test a variance using χ²', 'Compare two variances with the F-distribution', 'Find confidence intervals for a variance'], [], 'Further Hypothesis Tests'],
          ['t', 'Confidence intervals & tests using the t-distribution', 't distribution', ['Use the t-distribution for small samples', 'Carry out t-tests for a mean and paired t-tests', 'Test a difference of means with pooled variance'], [mam('statistics/t_distribution', 't-distribution')], 'Confidence Intervals and Tests using t-Distribution', 'Ch.7 Confidence Intervals and Tests Using t-Distribution']
        ]) },

      { id: 'fm2', option: 'fm2', name: 'Further Mechanics 2 (option)', papers: ['p4c'],
        res: [iygb('fm2', 'FM2')],
        topics: T('fm2', [
          ['circular', 'Circular motion', 'circular motion vertical circles conical pendulum', ['Use angular speed and centripetal acceleration', 'Solve horizontal circle problems (conical pendulum, banked tracks)', 'Solve vertical circle problems with energy'], [mam('mechanics/m2_m3_circular_motion', 'Circular motion')]],
          ['com1', 'Centres of mass of plane figures', 'centre of mass lamina', ['Find centres of mass of systems of particles', 'Find centres of mass of laminas and composite shapes', 'Solve suspended lamina and toppling problems'], [mam('mechanics/m2_centre_of_mass', 'Centre of mass')], 'Centres of Mass of Plane Figures'],
          ['com2', 'Further centres of mass', 'centre of mass calculus solid of revolution', ['Find centres of mass using calculus', 'Find centres of mass of solids of revolution', 'Solve equilibrium problems for rigid bodies'], [mam('mechanics/m3_centre_of_mass', 'Further centre of mass')], 'Further Centre of Masses', 'Ch.3 Further Centres of Mass'],
          ['kinematics', 'Kinematics', 'variable acceleration calculus v dv/dx', ['Use calculus for motion in a straight line', 'Use a = v dv/dx', 'Solve problems where acceleration depends on time, displacement or velocity'], [mam('mechanics/m3_m4_kinematics_dynamics_easier_odes', 'Kinematics with ODEs')]],
          ['dynamics', 'Dynamics', 'variable force dynamics differential equations', ["Apply Newton's second law with variable forces", 'Set up and solve differential equations of motion', 'Interpret solutions in context'], [mam('mechanics/m3_m4_kinematics_dynamics_easier_odes', 'Kinematics & dynamics with ODEs')]]
        ]) },

      { id: 'd2', option: 'd2', name: 'Decision Maths 2 (option)', papers: ['p4d'],
        res: [r('bicen', 'video', 'Bicen Maths: Decision playlists', 'https://www.youtube.com/@BicenMaths/playlists')],
        topics: T('d2', [
          ['transport', 'Transportation problems', 'transportation problems stepping stone', ['Find an initial solution with the north-west corner method', 'Use improvement indices and the stepping-stone method', 'Handle degeneracy and unbalanced problems', 'Formulate as a linear programme'], [], false],
          ['allocation', 'Allocation (assignment) problems', 'Hungarian algorithm', ['Use the Hungarian algorithm', 'Add dummy rows or columns', 'Adapt for maximising problems', 'Formulate as a linear programme'], [], false],
          ['flows', 'Flows in networks', 'maximum flow minimum cut', ['Find cut capacities', 'Use the maximum flow–minimum cut theorem', 'Use the labelling procedure to augment flows', 'Add supersources, supersinks and lower capacities'], [], false],
          ['dp', 'Dynamic programming', 'dynamic programming', ['Use stage, state and action', 'Solve shortest, longest, minimax and maximin path problems', 'Present solutions in a table'], [], false],
          ['games', 'Game theory', 'game theory zero sum', ['Find play-safe strategies and stable solutions', 'Reduce pay-off matrices by dominance', 'Find mixed strategies graphically', 'Formulate games as linear programmes'], [], false],
          ['recurrence', 'Recurrence relations', 'recurrence relations decision', ['Solve first-order recurrence relations', 'Solve second-order recurrence relations', 'Model with recurrence relations'], [], false],
          ['decision', 'Decision analysis', 'decision trees expected monetary value', ['Draw decision trees', 'Find expected monetary values', 'Choose the optimal decision and discuss utility'], [], false]
        ]) }
    ]
  });
})(window.RH = window.RH || {});
