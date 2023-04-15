import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function OfficePreview(props) {
    return (
        <BrowserOnly>
        { () => {
            return <iframe src={"//view.officeapps.live.com/op/embed.aspx?src=" + window.location.protocol + "//" + window.location.host + props.place} >这是嵌入 <a target="_blank" href="https://office.com">Microsoft Office</a> 演示文稿，由 <a target="_blank" href="https://office.com/webapps">Office</a> 提供支持。</iframe>
        }}
        </BrowserOnly>
    );
}

// frameBorder="0"