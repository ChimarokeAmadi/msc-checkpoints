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
