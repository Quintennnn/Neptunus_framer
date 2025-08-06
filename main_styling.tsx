/* ===============================
           Design Tokens
           =============================== */
        :root {
          /* Colors */
          --color-primary: #10069F;
          --color-accent: #7CC2FE;
          --color-border: rgba(208, 213, 223, 0.3); /* 30% opacity */
          --color-muted: #E0EFFF;
          --color-background: #ffffff;
          --color-main-text: #000000;
          --color-header-text: #10069F;
          --color-text-white: #ffffff;
          --color-text-muted: #8C8C8C;

          /* Font */
          --font-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
          --font-size-sm: 0.75rem;   /* 12px */
          --font-size-base: 1rem;    /* 16px */
          --font-size-lg: 1.5rem;    /* 24px */
          --font-size-lx: 2rem;      /* 32px */

          /* Spacing */
          --spacing-sm: 10px;
          --spacing-md: 16px;
          --spacing-lg: 20px;
        }

        /* ===============================
           Base Text
           =============================== */
        .text {
          font-family: var(--font-base);
          font-size: var(--font-size-base);
          color: var(--color-main-text);
          padding: var(--spacing-sm);
          line-height: 1.5;
        }

        /* ===============================
           Table
           =============================== */
        .table {
          width: 100%;
          background-color: var(--color-background);
          border-collapse: collapse;
        }

        .table th {
          background-color: var(--color-accent);
          text-align: center;
          padding: var(--spacing-sm);
          font-weight: bold;
          font-size: var(--font-size-sm);
          border: 1px solid var(--color-border);
        }

        .table td {
          padding: var(--spacing-sm);
          font-size: var(--font-size-sm);
          border: 1px solid var(--color-border);
        }

        /* ===============================
           Button with Icon
           =============================== */
        .button {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          background-color: var(--color-primary);
          border: 1px solid var(--color-primary);
          font-size: var(--font-size-sm);
          font-weight: 600;
          width: 140px;
          height: 200px;
          padding: 0;
          cursor: pointer;
          transition: all 0.3s ease;
          overflow: hidden;
          position: relative;
        }

        /* White background that expands from bottom */
        .button::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 40px; /* Initial height for text area */
          background-color: var(--color-text-white);
          transition: height 0.3s ease;
          z-index: 1;
        }

        .button:hover::before {
          height: 100%; /* Expand to full height on hover */
        }

        .button svg {
          width: 120px;
          height: 120px;
          fill: var(--color-text-white);
          transition: all 0.3s ease;
          margin-top: 20px;
          z-index: 2;
          position: relative;
        }

        .button span {
          color: var(--color-primary);
          text-align: center;
          width: 100%;
          padding: var(--spacing-sm) 0;
          transition: all 0.3s ease;
          z-index: 3;
          position: relative;
        }

        /* Hover transition: white expands from bottom, icon disappears */
        .button:hover {
          justify-content: center;
        }

        .button:hover svg {
          height: 0;
          opacity: 0;
          margin: 0;
        }

        .button:hover span {
          color: var(--color-primary);
        }

        /* ===============================
           Text Field
           =============================== */
        .textfield {
          width: 100%;
          padding: var(--spacing-sm);
          border: 1px solid var(--color-main-text);
          font-size: var(--font-size-base);
          background-color: var(--color-background);
          color: var(--color-main-text);
          font-family: var(--font-base);
        }

        .textfield::placeholder {
          color: var(--color-text-muted);
        }

        /* ===============================
           Section Header
           =============================== */
        .section-header {
          font-size: var(--font-size-lg);
          background-color: var(--color-muted);
          color: var(--color-header-text);
          padding: var(--spacing-sm);
          width: 100%;
          font-family: var(--font-base);
        }

        /* ===============================
           Additional Layout Styles
           =============================== */
        body {
          font-family: var(--font-base);
          background-color: #f5f5f5;
          margin: 0;
          padding: 20px;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          background-color: var(--color-background);
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .button-group {
          display: flex;
          gap: 20px;
          margin: 20px 0;
        }

        .form-section {
          margin: 30px 0;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 15px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .form-group label {
          font-size: var(--font-size-sm);
          font-weight: 600;
          color: var(--color-main-text);
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }