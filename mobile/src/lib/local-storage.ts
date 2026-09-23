// Gives native platforms a synchronous localStorage (backed by SQLite) so the
// Supabase client can persist the session. Browsers already have one.
import 'expo-sqlite/localStorage/install';
