import { AuthenticationCreds, AuthenticationState, SignalDataTypeMap, initAuthCreds, BufferJSON } from '@whiskeysockets/baileys';
import { supabaseAdmin } from './supabase';

export const useSupabaseAuth = async (id: string): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> => {
  const writeData = async (data: any, key: string) => {
    const jsonStr = JSON.stringify(data, BufferJSON.replacer);
    await supabaseAdmin.from('baileys_auth').upsert({ id: key, data: JSON.parse(jsonStr) });
  };

  const readData = async (key: string) => {
    const { data } = await supabaseAdmin.from('baileys_auth').select('data').eq('id', key).single();
    return data ? JSON.parse(JSON.stringify(data.data), BufferJSON.reviver) : null;
  };

  const removeData = async (key: string) => {
    await supabaseAdmin.from('baileys_auth').delete().eq('id', key);
  };

  const creds: AuthenticationCreds = (await readData(`${id}:creds`)) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data: any = {};
          await Promise.all(
            ids.map(async (item) => {
              let value = await readData(`${id}:${type}:${item}`);
              if (type === 'app-state-sync-key' && value) {
                value = BufferJSON.reviver(type, value);
              }
              data[item] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks: Promise<void>[] = [];
          for (const category in data) {
            for (const id_key in data[category as keyof SignalDataTypeMap]) {
              const value = data[category as keyof SignalDataTypeMap][id_key];
              const key = `${id}:${category}:${id_key}`;
              tasks.push(value ? writeData(value, key) : removeData(key));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: async () => {
      await writeData(creds, `${id}:creds`);
    },
  };
};
