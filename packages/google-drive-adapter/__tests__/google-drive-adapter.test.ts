/* eslint-disable camelcase */
import fs from 'fs';
import { join } from 'path';
import readline from 'readline';
import { google, Auth } from 'googleapis';
import { Filesystem } from '@draft-flysystem-ts/flysystem';
import { GoogleDriveAdapter } from '../src';

type CredentialsType = Record<string, any> & { web: any };
type OAuth2Client = Auth.OAuth2Client;
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';
let CREDENTIALS: CredentialsType | null = null;

async function _getAccessToken(oAuth2Client): Promise<OAuth2Client> {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });

    return new Promise<OAuth2Client>((resolve, reject) => {
        const offError = setTimeout(() => {
            reject(new Error('Unfortunately first time these tests need manual input! Retry again and be ready to follow console instructions.'));
        }, 30 * 1000);

        console.log('Authorize this app by visiting this url:', authUrl);

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question('Enter the code from that page here: ', (code) => {
            rl.close();
            clearTimeout(offError);
            oAuth2Client.getToken(code, (authError, token) => {
                if (authError) {
                    console.error('Error retrieving access token', authError);
                    reject(authError);
                }

                oAuth2Client.setCredentials(token);
                // Store the token to disk for later program executions
                fs.writeFile(TOKEN_PATH, JSON.stringify(token), (fsError) => {
                    if (fsError) reject(fsError);

                    console.log('Token stored to', TOKEN_PATH);

                    resolve(oAuth2Client);
                });
            });
        });
    });
}

async function authorize(credentials): Promise<OAuth2Client> {
    const { client_secret, client_id, redirect_uris } = credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    return new Promise<OAuth2Client>((resolve) => {
        fs.readFile(join(__dirname, '..', TOKEN_PATH), (err, token) => {
            if (err) return _getAccessToken(oAuth2Client).then(resolve);

            oAuth2Client.setCredentials(JSON.parse(token.toString()));

            return resolve(oAuth2Client);
        });
    });
}

describe('GoogleDriveAdapter testing', () => {
    let flysystem: Filesystem<GoogleDriveAdapter>;

    beforeAll(() => {
        console.log('before all');
        // Load client secrets from a local file.
        CREDENTIALS = JSON.parse(fs.readFileSync('credentials.json', { encoding: 'utf-8' }).toString()) as CredentialsType;

        console.log('CREDENTIALS', CREDENTIALS);
    });

    beforeEach(async () => {
        console.log('before each');

        const x = await authorize(CREDENTIALS);

        console.log('x', x);

        flysystem = new Filesystem(new GoogleDriveAdapter());
    });

    it('mock test', async () => {
        expect(flysystem).toBeInstanceOf(GoogleDriveAdapter);
    });
});
