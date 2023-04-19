import React from 'react';
import { useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useIsBrowser from '@docusaurus/useIsBrowser';


import 'aplayer/dist/APlayer.min.css';
import APlayer from 'aplayer';
import fetch from 'node-fetch';

export default function MusicPlayer(props) {
    // useEffect(() => {
    //     const ap = new APlayer({
    //         container: document.getElementById('aplayer'),
    //         fixed: true,
    //         audio: [{
    //             name: '光るなら',
    //             artist: 'Goose house (グースハウス)',
    //             url: '/music/1/1.flac',
    //             cover: '/music/1/1.jpg'
    //         }]
    //     });
    // }, []);

    return (
        <BrowserOnly>
        { () => {
            return (
                <>
                    <link rel="stylesheet" href="APlayer.min.css"/>
                    <script src="APlayer.min.js"></script>
                    <div id="aplayer"></div>
                </>
            )
        }}
        </BrowserOnly>
    );
}


// frameBorder="0"

