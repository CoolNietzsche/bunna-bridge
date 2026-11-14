-- Pandoc filter: tables span the full text width, and each column gets a share of it that follows
-- how much text the column holds (instead of equal columns), so short columns stay narrow.
local function cell_len(cell)
  return utf8.len(pandoc.utils.stringify(cell.contents)) or 0
end

function Table(tbl)
  local n = #tbl.colspecs
  if n == 0 then return nil end
  local total = {}
  for i = 1, n do total[i] = 0 end
  local function add_rows(rows)
    for _, row in ipairs(rows) do
      for i, cell in ipairs(row.cells) do
        if i <= n then total[i] = total[i] + cell_len(cell) end
      end
    end
  end
  add_rows(tbl.head.rows)
  for _, body in ipairs(tbl.bodies) do add_rows(body.body) end
  -- Square root keeps long columns from swallowing the page; a floor keeps short ones readable.
  local weights, sum = {}, 0
  for i = 1, n do
    weights[i] = math.max(math.sqrt(total[i]), 4)
    sum = sum + weights[i]
  end
  for i = 1, n do
    tbl.colspecs[i] = { tbl.colspecs[i][1], weights[i] / sum }
  end
  return tbl
end
