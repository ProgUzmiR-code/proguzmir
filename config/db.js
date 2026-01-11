import postgres from 'postgres';

// Validate env
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	// Fail fast with clear message
	throw new Error('Missing DATABASE_URL in environment. Set DATABASE_URL in .env or your environment variables.');
}

// Create and export postgres client (porsager/postgres)
const sql = postgres(connectionString, {
	ssl: { rejectUnauthorized: false } // adjust per your deployment/security requirements
});

export default sql;