def calculate_priority(severity, confidence):

    # Critical issues are always high priority.
    if severity == "CRITICAL":
        return "CRITICAL", 100

    if severity == "HIGH":
        return "HIGH", 75

    if severity == "MEDIUM":
        return "MEDIUM", 50

    return "LOW", 25