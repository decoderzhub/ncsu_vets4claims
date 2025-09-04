import React, { useEffect, useRef } from 'react';

interface Props {
  submissionSlug: string;
  email: string;
  onComplete: () => void;
}

const DocusealForm: React.FC<Props> = ({ submissionSlug, email, onComplete }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Listen for messages from DocuSeal iframe
    const handleMessage = (event: MessageEvent) => {
      // Accept messages from DocuSeal domains
      if (!event.origin.includes('docuseal.co') && !event.origin.includes('docuseal.com')) return;
      
      // Handle various completion events
      if (event.data.type === 'form.completed' || 
          event.data.type === 'submission.completed' ||
          (event.data.status && event.data.status === 'completed')) {
        onComplete();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onComplete]);

  // Use the correct DocuSeal signing URL format
  const docusealUrl = `https://docuseal.com/s/${submissionSlug}`;

  return (
    <iframe
      ref={iframeRef}
      src={docusealUrl}
      className="w-full h-full border-0"
      title="DocuSeal Form"
      allow="camera; microphone; clipboard-read; clipboard-write"
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
    />
  );
};

export default DocusealForm;