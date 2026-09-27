"""Domain errors for the Secret Cards engine."""


class EngineError(Exception):
    """Base class for engine rule violations."""


class InvalidPhaseError(EngineError):
    """Action is not allowed in the current phase."""


class InvalidNomineeError(EngineError):
    """Chancellor nominee is not eligible."""


class VoteAlreadyCastError(EngineError):
    """Player already cast a vote this nomination; votes cannot change."""


class UnknownPlayerError(EngineError):
    """Player id is not part of this game."""
