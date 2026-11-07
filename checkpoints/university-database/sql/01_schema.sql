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
