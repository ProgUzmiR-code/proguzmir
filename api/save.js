// Supabase sozlamalari
    const SUPABASE_URL = 'https://iqcpsqqsdspbonmurjxp.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_HFFtHiGVPBNg-AtRApiFqA_NKfMDevH';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // State-ni Supabase-ga sinxronizatsiya qilish
    async function syncSnapshotToSupabase(state) {
      if (!state.wallet) return;

      const { error } = await supabaseClient
        .from('user_states')
        .upsert({
          wallet: state.wallet,
          prc_wei: state.prcWei.toString(),
          diamond: state.diamond,
          taps_used: state.tapsUsed,
          tap_cap: state.tapCap,
          selected_skin: state.selectedSkin,
          energy: state.energy,
          max_energy: state.maxEnergy,
          today_index: state.todayIndex,
          last_sync: new Date().toISOString()
        }, { onConflict: 'wallet' });

      if (error) console.warn('Supabase sync error:', error.message);
    }