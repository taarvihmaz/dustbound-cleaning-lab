import math
import random
import pytest
from src.environment import Grid
from src.bfs import bfs, search
from src.bayes import infer, sensor_read
from src.mdp import decide, transition, TRANSITIONS, STATES, ACTIONS
from src.simulation import Simulation

def test_bfs_shortest_and_valid():
    grid = Grid()
    result = search(grid, (0,0), (0,4))
    assert len(result.path)-1 == 8  # must descend to row 2 and ascend again
    assert result.path[0] == (0,0) and result.path[-1] == (0,4)
    assert all(grid.valid(x) for x in result.path)
    assert all(abs(a[0]-b[0])+abs(a[1]-b[1]) == 1 for a,b in zip(result.path,result.path[1:]))
    assert len({tuple(t['expanded']) for t in result.trace}) == len(result.trace)

def test_bfs_same_cell():
    assert bfs(Grid(), (0,0), (0,0)) == [(0,0)]

def test_unreachable():
    grid=Grid(3,3,frozenset({(1,0),(1,1),(1,2)}))
    assert bfs(grid,(0,0),(2,2)) is None

@pytest.mark.parametrize('cell', [(0,2),(-1,0),(5,0)])
def test_invalid_endpoint(cell):
    with pytest.raises(ValueError): bfs(Grid(),cell,(0,4))

@pytest.mark.parametrize('positive,expected', [(True,12/19),(False,3/31)])
def test_bayes(positive,expected):
    b=infer(positive=positive)
    assert b.posterior == pytest.approx(expected)
    assert b.evidence == pytest.approx(.38 if positive else .62)

@pytest.mark.parametrize('p', [-.1,1.1,float('nan'),float('inf')])
def test_invalid_probabilities(p):
    with pytest.raises(ValueError): infer(prior=p)
    with pytest.raises(ValueError): decide(p)

def test_impossible_observation():
    with pytest.raises(ValueError): infer(.3,0,0,True)

@pytest.mark.parametrize('prior',[0,1])
def test_certain_prior(prior):
    assert infer(prior=prior).posterior == prior

@pytest.mark.parametrize('p,action,qc,qm',[(0,'Move On',-4,2),(.25,'Move On',-.5,-.5),(1,'Clean',10,-8),(12/19,'Clean',92/19,-82/19),(3/31,'Move On',-82/31,32/31)])
def test_decision(p,action,qc,qm):
    d=decide(p)
    assert d.action == action
    assert d.q_clean == pytest.approx(qc)
    assert d.q_move_on == pytest.approx(qm)
    assert d.next_dirty_probability == pytest.approx(0 if action=='Clean' else p)

@pytest.mark.parametrize('state',STATES)
@pytest.mark.parametrize('action',ACTIONS)
def test_transition(state,action):
    assert sum(TRANSITIONS[action][state].values()) == 1
    assert transition(state,action) == ('Clean' if action=='Clean' else state)

@pytest.mark.parametrize('dirty',[True,False])
@pytest.mark.parametrize('mode',['Positive','Negative'])
def test_pipeline(mode,dirty):
    s=Simulation(mode=mode,dirty=dirty)
    with pytest.raises(ValueError): s.scan()
    with pytest.raises(ValueError): s.decide()
    for _ in range(9): s.step()
    assert s.position == (0,4) and s.phase == 'SCANNING'
    s.scan()
    with pytest.raises(ValueError): s.scan()
    s.decide()
    assert s.phase=='FINISHED'
    assert s.decision.action == ('Clean' if mode=='Positive' else 'Move On')
    assert s.dirty == (False if mode=='Positive' else dirty)
    before=list(s.log); s.step(); assert s.log==before
    with pytest.raises(ValueError): s.decide()

def test_blocked_simulation():
    s=Simulation(grid=Grid(3,3,frozenset({(1,0),(1,1),(1,2)})),goal=(2,2))
    s.step(); assert s.phase=='BLOCKED'
    s.step(); assert s.position==(0,0)

def test_random_reproducible():
    a,b=Simulation(mode='Random',seed=42),Simulation(mode='Random',seed=42)
    for _ in range(11): a.step(); b.step()
    assert a.log==b.log

def test_sensor_rates():
    rng=random.Random(127)
    for dirty,expected in [(True,.8),(False,.2)]:
        rate=sum(sensor_read(dirty,rng) for _ in range(20000))/20000
        assert abs(rate-expected)<.02
