from fastapi import FastAPI


app = FastAPI(title="QueryLearn API")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
