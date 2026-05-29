// Runs before the test modules' imports resolve, so db.js opens an in-memory
// database instead of the real file. dotenv (loaded transitively by app.js) does
// not override variables already present in process.env, so these values win even
// though .env exists — and the suite still passes on a clean checkout with no .env.
process.env.DATABASE_FILE = ":memory:";
process.env.JWT_SECRET = "test-secret-do-not-use-in-prod";
