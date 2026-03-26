ALTER TABLE position_stages
  ADD COLUMN labor_hours FLOAT DEFAULT 0 AFTER stage_order,
  ADD COLUMN labor_rate FLOAT DEFAULT 0 AFTER labor_hours,
  ADD COLUMN material_cost FLOAT DEFAULT 0 AFTER labor_rate,
  ADD COLUMN stage_cost FLOAT DEFAULT 0 AFTER material_cost,
  ADD COLUMN remarks TEXT NULL AFTER stage_cost,
  ADD COLUMN started_at DATETIME NULL AFTER remarks,
  ADD COLUMN completed_at DATETIME NULL AFTER started_at;

UPDATE position_stages
SET
  labor_hours = COALESCE(labor_hours, 0),
  labor_rate = COALESCE(labor_rate, 0),
  material_cost = COALESCE(material_cost, 0),
  stage_cost = (COALESCE(labor_hours, 0) * COALESCE(labor_rate, 0)) + COALESCE(material_cost, 0)
WHERE id > 0;

UPDATE structural_components sc
JOIN (
  SELECT position_id, COALESCE(SUM(stage_cost), 0) AS total_stage_cost
  FROM position_stages
  GROUP BY position_id
) ps ON ps.position_id = sc.position_id
SET sc.cost = ps.total_stage_cost
WHERE sc.is_deleted = 0;
