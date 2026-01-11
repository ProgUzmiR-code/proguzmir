async function loadUserStateFromSupabase(walletOrIdentifier) {
    try {
        const client = window.supabaseClient || (typeof supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_KEY ? supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY) : null);
        if (!client) { console.warn('loadUserStateFromSupabase: supabase client not initialized'); return null; }

        // normalize incoming identifier into our wallet key convention
        function normalizeUserKeyLocal(idOrObj) {
            if (!idOrObj) return 'guest';
            if (typeof idOrObj === 'object') {
                if (idOrObj.tgId) return 'tg_' + String(idOrObj.tgId);
                if (idOrObj.username) return 'user_' + String(idOrObj.username).toLowerCase();
            }
            const s = String(idOrObj);
            if (/^\d+$/.test(s)) return 'tg_' + s;
            if (s.startsWith('tg_') || s.startsWith('user_')) return s;
            return 'user_' + s.toLowerCase();
        }

        const walletKey = normalizeUserKeyLocal(walletOrIdentifier || localStorage.getItem('proguzmir_wallet') || '');

        const { data, error } = await client.from('user_states').select('*').eq('wallet', walletKey).maybeSingle();
        if (error) { console.warn('loadUserStateFromSupabase error', error); return null; }
        if (!data) return null;

        return {
            prcWei: BigInt(data.prc_wei || '0'),
            diamond: Number(data.diamond || 0),
            tapsUsed: Number(data.taps_used || 0),
            tapCap: Number(data.tap_cap || 0),
            selectedSkin: data.selected_skin || '',
            energy: Number(data.energy || 0),
            maxEnergy: Number(data.max_energy || 0),
            todayIndex: Number(data.today_index || 0),
            wallet: data.wallet
        };
    } catch (err) {
        console.warn('loadUserStateFromSupabase error', err);
        return null;
    }
}