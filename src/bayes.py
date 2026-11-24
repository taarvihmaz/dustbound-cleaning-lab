from dataclasses import dataclass
import math

def probability(value):
    if not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= 1:
        raise ValueError("Probability must be finite and in [0, 1]")
    return value

@dataclass(frozen=True)
class BayesResult:
    prior: float
    dirty_likelihood: float
    clean_likelihood: float
    numerator: float
    evidence: float
    posterior: float
    positive: bool

def infer(prior=0.3, sensitivity=0.8, false_positive=0.2, positive=True):
    for v in (prior, sensitivity, false_positive):
        probability(v)
    if not isinstance(positive, bool):
        raise ValueError("Observation must be boolean")
    ld = sensitivity if positive else 1-sensitivity
    lc = false_positive if positive else 1-false_positive
    numerator = ld * prior
    evidence = numerator + lc * (1-prior)
    if evidence == 0:
        raise ValueError("Observation has zero probability under this model")
    return BayesResult(prior, ld, lc, numerator, evidence, numerator/evidence, positive)

def bayes_update(prior, sensitivity, false_positive, signal):
    return infer(prior, sensitivity, false_positive, signal).posterior

def sensor_read(dirty, rng, sensitivity=0.8, false_positive=0.2):
    probability(sensitivity)
    probability(false_positive)
    return rng.random() < (sensitivity if dirty else false_positive)
