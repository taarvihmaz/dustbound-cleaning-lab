from collections import deque
from dataclasses import dataclass

@dataclass
class SearchResult:
    path: list | None
    trace: list

def search(grid, start, goal):
    if not grid.valid(start) or not grid.valid(goal):
        raise ValueError("Start and goal must be traversable")
    queue = deque([start])
    parent = {start: None}
    trace = []
    while queue:
        current = queue.popleft()
        trace.append({"expanded": current, "queue_after_pop": list(queue), "discovered": len(parent)})
        if current == goal:
            path = []
            while current is not None:
                path.append(current)
                current = parent[current]
            return SearchResult(path[::-1], trace)
        for nxt in grid.neighbors(current):
            if nxt not in parent:
                parent[nxt] = current
                queue.append(nxt)
    return SearchResult(None, trace)

def bfs(grid, start, goal):
    return search(grid, start, goal).path
