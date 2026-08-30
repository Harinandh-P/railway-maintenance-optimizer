from backend.database import execute_statement

class AuditService:
    @staticmethod
    def log_action(username: str, role: str, action: str, dataset: str = None, details: str = None):
        try:
            execute_statement(
                "INSERT INTO audit_log (username, role, action, dataset, details) VALUES (?, ?, ?, ?, ?)",
                (username, role, action, dataset, details)
            )
        except Exception as e:
            print(f"[Audit Error] Failed to log action: {e}")
