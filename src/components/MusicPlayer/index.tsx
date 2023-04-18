import React from 'react';
import { useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import 'aplayer/dist/APlayer.min.css';
import APlayer from 'aplayer';

export default function MusicPlayer(props) {
    return (
        <BrowserOnly>
        { () => {
            useEffect(() => {
                const ap = new APlayer({
                    container: document.getElementById('aplayer'),
                    audio: [{
                        name: '光るなら',
                        artist: 'Goose house (グースハウス)',
                        url: '/music/1/1.flac',
                        cover: '/music/1/1.jpg'
                    }]
                });1
            }, []);
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

