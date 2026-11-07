-- University database checkpoint (MySQL 8+)
-- Steps 1 to 4 in one file. Generated from the sql/ folder by run.js.

-- =====================================================================
-- Step 1 & 2: Schema design and table creation (MySQL 8+)
-- =====================================================================
--
-- Relational model (PK underlined as [ ], FK marked with #):
--   Departments (department_id, name)
--   Instructors (instructor_id, full_name, email, #department_id)
--   Students    (student_id, full_name, email, age)
--   Courses     (course_id, title, credits, #instructor_id)
--   Enrollments (#student_id, #course_id, grade, enrolled_on)
--
-- Normalization:
--   1NF: every column holds one atomic value (no lists like "courses: DB, Web").
--   2NF: Enrollments has a composite key (student_id, course_id); grade and
--        enrolled_on depend on the WHOLE key, not on just the student or just the
--        course. Student names / course titles are NOT copied into Enrollments.
--   3NF: no column depends on another non-key column. The department of an
--        instructor was moved into its own Departments table, so a department's
--        name is stored once instead of being repeated for every instructor.

DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS instructors;
DROP TABLE IF EXISTS departments;

CREATE TABLE departments (
  department_id INT          NOT NULL AUTO_INCREMENT,
  name          VARCHAR(80)  NOT NULL,
  CONSTRAINT pk_departments PRIMARY KEY (department_id),
  CONSTRAINT uq_departments_name UNIQUE (name)
);

CREATE TABLE instructors (
  instructor_id INT          NOT NULL AUTO_INCREMENT,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(120) NOT NULL,
  department_id INT          NOT NULL,
  CONSTRAINT pk_instructors PRIMARY KEY (instructor_id),
  CONSTRAINT uq_instructors_email UNIQUE (email),
  CONSTRAINT chk_instructors_email CHECK (email LIKE '%_@_%._%'),
  -- a department that still has instructors can't be deleted
  CONSTRAINT fk_instructors_department FOREIGN KEY (department_id)
    REFERENCES departments (department_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE students (
  student_id INT          NOT NULL AUTO_INCREMENT,
  full_name  VARCHAR(100) NOT NULL,
  email      VARCHAR(120) NOT NULL,
  age        TINYINT UNSIGNED NOT NULL,
  CONSTRAINT pk_students PRIMARY KEY (student_id),
  CONSTRAINT uq_students_email UNIQUE (email),
  CONSTRAINT chk_students_email CHECK (email LIKE '%_@_%._%'),
  CONSTRAINT chk_students_age CHECK (age > 17 AND age < 100)
);

CREATE TABLE courses (
  course_id     INT          NOT NULL AUTO_INCREMENT,
  title         VARCHAR(120) NOT NULL,
  credits       TINYINT UNSIGNED NOT NULL,
  instructor_id INT          NULL,  -- a new course may not have an instructor yet
  CONSTRAINT pk_courses PRIMARY KEY (course_id),
  CONSTRAINT uq_courses_title UNIQUE (title),
  CONSTRAINT chk_courses_credits CHECK (credits BETWEEN 1 AND 10),
  -- if an instructor leaves, their courses stay but have no instructor
  CONSTRAINT fk_courses_instructor FOREIGN KEY (instructor_id)
    REFERENCES instructors (instructor_id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE enrollments (
  student_id  INT     NOT NULL,
  course_id   INT     NOT NULL,
  grade       CHAR(1) NULL,  -- NULL = course still in progress
  enrolled_on DATE    NOT NULL DEFAULT (CURRENT_DATE),
  -- one enrollment per student per course
  CONSTRAINT pk_enrollments PRIMARY KEY (student_id, course_id),
  CONSTRAINT chk_enrollments_grade CHECK (grade IN ('A', 'B', 'C', 'D', 'E', 'F')),
  -- deleting a student or a course also deletes their enrollments
  CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id)
    REFERENCES students (student_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_enrollments_course FOREIGN KEY (course_id)
    REFERENCES courses (course_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Speeds up "who is enrolled in course X?" (the PK already covers lookups by student)
CREATE INDEX idx_enrollments_course ON enrollments (course_id);

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

-- =====================================================================
-- Step 4: Queries
-- =====================================================================

-- Query 1: All students enrolled in the course "Database Systems"
SELECT s.student_id, s.full_name, s.email, e.grade
FROM students AS s
JOIN enrollments AS e ON e.student_id = s.student_id
JOIN courses AS c     ON c.course_id  = e.course_id
WHERE c.title = 'Database Systems'
ORDER BY s.full_name;

-- Query 2: All courses with the name of their instructor
-- (LEFT JOIN, so a course without an instructor is still listed)
SELECT c.course_id,
       c.title,
       c.credits,
       COALESCE(i.full_name, '(not assigned yet)') AS instructor,
       d.name AS department
FROM courses AS c
LEFT JOIN instructors AS i ON i.instructor_id = c.instructor_id
LEFT JOIN departments AS d ON d.department_id = i.department_id
ORDER BY c.course_id;

-- Query 3: Students who are not enrolled in any course
SELECT s.student_id, s.full_name, s.email
FROM students AS s
WHERE NOT EXISTS (
  SELECT 1 FROM enrollments AS e WHERE e.student_id = s.student_id
)
ORDER BY s.student_id;

-- Query 4: Update the email address of a student
UPDATE students
SET email = 'chinedu.okafor@gmail.com'
WHERE student_id = 2;

-- Check: the student after the update
SELECT student_id, full_name, email FROM students WHERE student_id = 2;

-- Query 5: Delete a course by its ID
-- Course 1 (Database Systems) has enrollments: ON DELETE CASCADE removes them too.
DELETE FROM courses
WHERE course_id = 1;

-- Check: the remaining courses
SELECT course_id, title FROM courses ORDER BY course_id;

-- Check: the enrollments of course 1 are gone too (cascade)
SELECT student_id, course_id, grade FROM enrollments ORDER BY student_id, course_id;
