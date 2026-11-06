-- Restore reference images from the official Sensei question export (course 206).
WITH reference_images(legacy_lesson_id, question_id, src) AS (
  VALUES
    (432, '493', '/media/wordpress/39645c6cb48f3118135a.jpg'),
    (432, '494', '/media/wordpress/0b5715466e2c5256894a.jpg'),
    (432, '495', '/media/wordpress/1a168760530ab5658d8a.jpg'),
    (432, '496', '/media/wordpress/4035f97a238606529c9d.jpg'),
    (432, '497', '/media/wordpress/2a91673886374d0d9fe3.jpg'),
    (432, '498', '/media/wordpress/4060f4c937a14c3034c9.jpg'),
    (432, '499', '/media/wordpress/5b4ee59bf68d1d2dc17d.jpg'),
    (432, '500', '/media/wordpress/dfba3e1e5ddc64c22f6c.jpg'),
    (432, '501', '/media/wordpress/5e745ad7a392b6e98466.jpg'),
    (432, '502', '/media/wordpress/32f92617ff0ec32cb5cd.jpg'),
    (432, '503', '/media/wordpress/0013e23d550b90d1770b.jpg'),
    (432, '504', '/media/wordpress/748dc93a3d15d5d5055f.jpg'),
    (1035, '1066', '/media/wordpress/409609043be93d55372f.png'),
    (1035, '1067', '/media/wordpress/63459bac1f482f50879f.png'),
    (1035, '1068', '/media/wordpress/4a2f90e2299deceaafd1.png')
)
UPDATE course_lesson AS lesson
SET quiz = (
  SELECT jsonb_agg(
    CASE WHEN reference.src IS NOT NULL AND NOT (item.question ? 'images')
      THEN item.question || jsonb_build_object('images', jsonb_build_array(
        jsonb_build_object('src', reference.src, 'alt', '')
      ))
      ELSE item.question
    END ORDER BY item.position
  )
  FROM jsonb_array_elements(lesson.quiz) WITH ORDINALITY AS item(question, position)
  LEFT JOIN reference_images AS reference
    ON reference.legacy_lesson_id = lesson.legacy_id
    AND reference.question_id = item.question->>'id'
)
FROM course
WHERE course.id = lesson.course_id AND course.legacy_id = 206
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(lesson.quiz) AS item(question)
    JOIN reference_images AS reference
      ON reference.legacy_lesson_id = lesson.legacy_id
      AND reference.question_id = item.question->>'id'
    WHERE NOT (item.question ? 'images')
  );
