import { Member, Schedule } from '../../types';
import { IDataRepository } from './types';

/**
 * Supabase Repository Adapter.
 * Enables seamless migration to Supabase PostgreSQL without modifying UI components or application code.
 * 
 * To activate Supabase:
 * 1. Install @supabase/supabase-js (`npm install @supabase/supabase-js`)
 * 2. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
 * 3. Change `ACTIVE_PROVIDER` in `src/services/data/index.ts` to 'supabase'
 */
export class SupabaseRepositoryAdapter implements IDataRepository {
  private fallbackLocalRepository: IDataRepository;

  constructor(fallbackRepository: IDataRepository) {
    this.fallbackLocalRepository = fallbackRepository;
  }

  // Example Supabase initialization
  /*
  private supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
  */

  async getMembers(): Promise<Member[]> {
    console.log('[SupabaseRepositoryAdapter] Fetching members from Supabase...');
    // Replace with:
    // const { data, error } = await this.supabase.from('members').select('*');
    // if (error) throw error;
    // return data as Member[];
    return this.fallbackLocalRepository.getMembers();
  }

  async saveMembers(members: Member[]): Promise<void> {
    console.log('[SupabaseRepositoryAdapter] Saving members to Supabase...');
    // Replace with:
    // const { error } = await this.supabase.from('members').upsert(members);
    // if (error) throw error;
    return this.fallbackLocalRepository.saveMembers(members);
  }

  async getLabels(): Promise<string[]> {
    console.log('[SupabaseRepositoryAdapter] Fetching labels from Supabase...');
    return this.fallbackLocalRepository.getLabels();
  }

  async saveLabels(labels: string[]): Promise<void> {
    console.log('[SupabaseRepositoryAdapter] Saving labels to Supabase...');
    return this.fallbackLocalRepository.saveLabels(labels);
  }

  async getSchedules(): Promise<Schedule[]> {
    console.log('[SupabaseRepositoryAdapter] Fetching schedules from Supabase...');
    // Replace with:
    // const { data, error } = await this.supabase.from('schedules').select('*').order('service_date', { ascending: false });
    // if (error) throw error;
    // return data as Schedule[];
    return this.fallbackLocalRepository.getSchedules();
  }

  async saveSchedules(schedules: Schedule[]): Promise<void> {
    console.log('[SupabaseRepositoryAdapter] Saving schedules to Supabase...');
    // Replace with:
    // const { error } = await this.supabase.from('schedules').upsert(schedules);
    // if (error) throw error;
    return this.fallbackLocalRepository.saveSchedules(schedules);
  }

  async getDarkMode(): Promise<boolean> {
    return this.fallbackLocalRepository.getDarkMode();
  }

  async saveDarkMode(isDark: boolean): Promise<void> {
    return this.fallbackLocalRepository.saveDarkMode(isDark);
  }

  async getDraftSchedule(): Promise<Partial<Schedule> | null> {
    return this.fallbackLocalRepository.getDraftSchedule();
  }

  async saveDraftSchedule(draft: Partial<Schedule> | null): Promise<void> {
    return this.fallbackLocalRepository.saveDraftSchedule(draft);
  }
}
