from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "DarkVector"
    APP_VERSION: str = "0.1.0"

    HOST: str = "0.0.0.0"
    PORT: int = 8000
    SENTINEL_API_KEY: str = "darkvector-dev-key"
    DATABASE_URL: str

    LOG_LEVEL: str = "INFO"

    GEMINI_API_KEY: str = ""
    USE_LLM: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
    )


settings = Settings()