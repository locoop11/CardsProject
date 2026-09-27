"""Domain errors for the Secret Cards engine."""


class EngineError(Exception):
    """Base class for engine rule violations."""


class InvalidPhaseError(EngineError):
    """Action is not allowed in the current phase."""


class InvalidNomineeError(EngineError):
    """Chancellor nominee is not eligible."""
