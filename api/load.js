async function loadStateFromSupabase(wallet) {
    if (!supabaseClient || !wallet) return null;
    try {
        const { data, error } = await supabaseClient.from('users').select('*').eq('id', wallet).maybeSingle();
        if (error) { console.warn('loadStateFromSupabase error', error); return null; }
        if (!data) return null;
        return {
            prcWei: BigInt(data.prc_wei || '0'),
            diamond: Number(data.diamond || 0),
            tapsUsed: Number(data.taps_used || 0),
            tapCap: Number(data.tap_cap || DEFAULT_TAP_CAP),
            selectedSkin: data.selected_skin || '',
            energy: Number(data.energy || DEFAULT_MAX_ENERGY),
            maxEnergy: Number(data.max_energy || DEFAULT_MAX_ENERGY),
            todayIndex: Number(data.today_index || 0),
            wallet
        };
    } catch (err) {
        console.warn('loadStateFromSupabase error', err);
        return null;
    }
}