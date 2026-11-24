from dataclasses import dataclass

@dataclass(frozen=True)
class Grid:
    rows: int = 5
    cols: int = 5
    walls: frozenset = frozenset({(0, 2), (1, 2)})

    def __post_init__(self):
        if self.rows <= 0 or self.cols <= 0:
            raise ValueError("Grid dimensions must be positive")
        if any(not (0 <= r < self.rows and 0 <= c < self.cols) for r, c in self.walls):
            raise ValueError("Wall outside grid")

    def valid(self, cell):
        r, c = cell
        return 0 <= r < self.rows and 0 <= c < self.cols and cell not in self.walls

    def neighbors(self, cell):
        r, c = cell
        return [x for x in ((r+1,c),(r,c+1),(r-1,c),(r,c-1)) if self.valid(x)]
