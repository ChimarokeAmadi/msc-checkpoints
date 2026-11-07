-- =====================================================================
-- Step 3: Sample data
-- =====================================================================

INSERT INTO departments (department_id, name) VALUES
  (1, 'Computer Science'),
  (2, 'Information Systems'),
  (3, 'Mathematics');

INSERT INTO instructors (instructor_id, full_name, email, department_id) VALUES
  (1, 'Dr. Ngozi Eze',      'ngozi.eze@uni.edu',      1),
  (2, 'Mr. Tunde Bakare',   'tunde.bakare@uni.edu',   2),
  (3, 'Prof. Aisha Lawal',  'aisha.lawal@uni.edu',    3),
  (4, 'Dr. Emeka Obi',      'emeka.obi@uni.edu',      1);

INSERT INTO students (student_id, full_name, email, age) VALUES
  (1, 'Amina Yusuf',     'amina.yusuf@student.uni.edu',     19),
  (2, 'Chinedu Okafor',  'chinedu.okafor@student.uni.edu',  22),
  (3, 'Fatima Bello',    'fatima.bello@student.uni.edu',    20),
  (4, 'David Mensah',    'david.mensah@student.uni.edu',    18),  -- not enrolled in anything
  (5, 'Grace Adeyemi',   'grace.adeyemi@student.uni.edu',   24);

INSERT INTO courses (course_id, title, credits, instructor_id) VALUES
  (1, 'Database Systems',   4, 1),
  (2, 'Web Development',    3, 2),
  (3, 'Discrete Mathematics', 3, 3),
  (4, 'Technical Writing',  2, NULL);  -- no instructor assigned yet

INSERT INTO enrollments (student_id, course_id, grade, enrolled_on) VALUES
  (1, 1, 'A',  '2026-09-08'),
  (1, 2, 'B',  '2026-09-08'),
  (2, 1, 'C',  '2026-09-09'),
  (3, 1, NULL, '2026-09-10'),  -- still in progress
  (3, 3, 'B',  '2026-09-10'),
  (5, 2, 'A',  '2026-09-11'),
  (5, 3, NULL, '2026-09-11');
