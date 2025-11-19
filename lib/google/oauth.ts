// 認可URL生成・トークン取得/更新を行うGoogle OAuthクライアント
import { google } from 'googleapis';
import { createClient } from "@/lib/supabase/server";
import { access } from 'fs';

// OAuth2Clientのインスタンスを生成して返す関数
function getOAuthClient() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
}

// 認可URLを生成する関数
export function generateAuthUrl() {
    const oAuth2Client = getOAuthClient();
    const url = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/userinfo.email',
        ],
    });

    return url;
    
}

// 認可コードからトークン取得
export async function getTokenFromCode(code: string) {
    const oAuth2Client = getOAuthClient();
    const { tokens } = await oAuth2Client.getToken(code);
    return tokens;
}

// Supabaseにトークン保存
export async function saveGoogleTokens(userId: string, tokens: any) {
    const supabase = createClient();

    await supabase
        .from('user_google_tokens')
        .upsert({
            user_id: userId,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date,
        });
}

// リフレッシュトークンでアクセストークンを更新する
export async function refreshAccessToken(userId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('user_google_tokens')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error || !data?.refresh_token) {
        throw new Error('No refresh token found');
    }

    const oAuth2Client = getOAuthClient();
    oAuth2Client.setCredentials({
        refresh_token: data.refresh_token,
    });

    const { credentials } = await oAuth2Client.refreshAccessToken();
    await saveGoogleTokens(userId, credentials);

    return credentials.access_token;
}

// アクセストークンを取得する（期限切れの場合更新する）
export async function getValidAccessToken(userId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('user_google_tokens')
        .select('*')
        .eq('user_id', userId)
        .single();
    if (error || !data) {
        throw new Error('No tokens found for user');
    }

    const isExpired = Date.now() > data.expiry_date;
    if (isExpired) {
        return await refreshAccessToken(userId);
    } else {
        return data.access_token;
    }
}
    