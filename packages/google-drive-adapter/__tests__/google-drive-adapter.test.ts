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
const WAIT_FRO_MANUAL_INPUT = 40 * 1000;

async function _getAccessToken(oAuth2Client: OAuth2Client): Promise<OAuth2Client> {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });

    return new Promise<OAuth2Client>((resolve, reject) => {
        const offError = setTimeout(() => {
            reject(new Error('Unfortunately first time these tests need manual input! Retry again and be ready to follow console instructions.'));
        }, WAIT_FRO_MANUAL_INPUT);

        console.info('Authorize this app by visiting this url:', authUrl);

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

                oAuth2Client.setCredentials(token!);
                // Store the token to disk for later program executions
                fs.writeFile(TOKEN_PATH, JSON.stringify(token), (fsError) => {
                    if (fsError) reject(fsError);

                    console.info('Token stored to', TOKEN_PATH);

                    resolve(oAuth2Client);
                });
            });
        });
    });
}

async function authorize(credentials: CredentialsType): Promise<OAuth2Client> {
    const { client_secret, client_id, redirect_uris } = credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    return new Promise<OAuth2Client>((resolve) => {
        fs.readFile(join(__dirname, '..', TOKEN_PATH), (err, token) => {
            if (!err) {
                const creds = JSON.parse(token.toString()) || {};
                const isFresh = (creds.expiry_date || 0) > (new Date().getTime() + 60 * 1000);

                // Check if access is fresh otherwise - has json refresh
                if (isFresh || creds.refresh_token) {
                    oAuth2Client.setCredentials(creds);

                    return resolve(oAuth2Client);
                }
            }

            return _getAccessToken(oAuth2Client).then(resolve);
        });
    });
}

describe('GoogleDriveAdapter testing', () => {
    let flysystem: Filesystem<GoogleDriveAdapter>;
    let auth: OAuth2Client;
    /**
     * AT FIRST TIME OF TEST'S RUN YOU SHOULD MANUALY CLICK TO LINK IN TERMINAL
     * IT WILL OPEN PAGE WITH ACCESS TOKEN
     * COPY AND PASTE BACK TO CONSOLE
     *
     * (YOU HAVE 40 SECS)
     */
    beforeAll(async () => {
        // Load client secrets from a local file.
        CREDENTIALS = JSON.parse(fs.readFileSync('credentials.json', { encoding: 'utf-8' }).toString()) as CredentialsType;

        auth = await authorize(CREDENTIALS!);
    }, WAIT_FRO_MANUAL_INPUT + 5 * 10000); // little more than input to give chance correct error appear in console in case of fail

    beforeEach(async () => {
        flysystem = new Filesystem(new GoogleDriveAdapter(auth));
    });

    it.only('Should return list of files', async () => {
        const res = await flysystem.listContents();

        console.log(res);

        expect(res).toBeInstanceOf(Array);
    });
});
