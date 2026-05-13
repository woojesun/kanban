-- 중복 카드 정리: 같은 사용자의 같은 컬럼에서 동일한 텍스트 중 가장 오래된 것만 남김
DELETE FROM cards
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, column_id, text) id
  FROM cards
  ORDER BY user_id, column_id, text, created_at ASC
);
