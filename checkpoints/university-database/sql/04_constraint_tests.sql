-- =====================================================================
-- Bonus: proving the constraints work
-- Every statement below SHOULD FAIL, with the error written under "expect".
-- run.js checks that each one is rejected for the right reason.
-- (Run it after 01, 02 and 03.)
-- =====================================================================

-- Test: a 16-year-old student (CHECK age > 17)
-- expect: ER_CHECK_CONSTRAINT_VIOLATED
INSERT INTO students (full_name, email, age) VALUES ('Too Young', 'young@student.uni.edu', 16);

-- Test: an email that is already used (UNIQUE)
-- expect: ER_DUP_ENTRY
INSERT INTO students (full_name, email, age) VALUES ('Copy Cat', 'amina.yusuf@student.uni.edu', 21);

-- Test: a student without a name (NOT NULL)
-- expect: ER_BAD_NULL_ERROR
INSERT INTO students (full_name, email, age) VALUES (NULL, 'noname@student.uni.edu', 21);

-- Test: an email that doesn't look like an email (CHECK)
-- expect: ER_CHECK_CONSTRAINT_VIOLATED
INSERT INTO students (full_name, email, age) VALUES ('Bad Email', 'not-an-email', 21);

-- Test: two courses with the same title (UNIQUE)
-- expect: ER_DUP_ENTRY
INSERT INTO courses (title, credits) VALUES ('Web Development', 3);

-- Test: a course with 0 credits (CHECK credits BETWEEN 1 AND 10)
-- expect: ER_CHECK_CONSTRAINT_VIOLATED
INSERT INTO courses (title, credits) VALUES ('Free Lunch 101', 0);

-- Test: enrolling a student who doesn't exist (FOREIGN KEY)
-- expect: ER_NO_REFERENCED_ROW_2
INSERT INTO enrollments (student_id, course_id) VALUES (999, 2);

-- Test: enrolling the same student twice in the same course (PRIMARY KEY)
-- expect: ER_DUP_ENTRY
INSERT INTO enrollments (student_id, course_id) VALUES (1, 2);

-- Test: a grade that doesn't exist (CHECK grade IN ...)
-- expect: ER_CHECK_CONSTRAINT_VIOLATED
INSERT INTO enrollments (student_id, course_id, grade) VALUES (4, 2, 'Z');

-- Test: deleting a department that still has instructors (ON DELETE RESTRICT)
-- expect: ER_ROW_IS_REFERENCED_2
DELETE FROM departments WHERE department_id = 1;
