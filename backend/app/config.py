from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "sqlite:///./docguard.db"
    jwt_secret_key: str = "docguard-secret-key-super-secure-change-in-prod-2026"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480

    sandbox_base_url: str = ""
    sandbox_client_id: str = ""
    sandbox_client_secret: str = ""
    sandbox_api_key: str = ""

    bhashini_enabled: bool = False
    bhashini_api_key: str = ""
    bhashini_base_url: str = ""
    bhashini_pipeline_id: str = ""
    bhashini_user_id: str = ""

    allowed_origins: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"


settings = Settings()