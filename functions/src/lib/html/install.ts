export const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Install page</title>
    <style>
      @layer base, components, utilities;

      @layer base {
        /* @link https://utopia.fyi/space/calculator?c=320,16,1.2,1240,20,1.25,5,2,&s=0.75|0.5|0.25,1.5|2|3|4|6,s-l&g=s,l,xl,12 */

        :root {
          --space-3xs: clamp(0.25rem, calc(0.23rem + 0.11vw), 0.31rem);
          --space-2xs: clamp(0.50rem, calc(0.46rem + 0.22vw), 0.63rem);
          --space-xs: clamp(0.75rem, calc(0.68rem + 0.33vw), 0.94rem);
          --space-s: clamp(1.00rem, calc(0.91rem + 0.43vw), 1.25rem);
          --space-m: clamp(1.50rem, calc(1.37rem + 0.65vw), 1.88rem);
          --space-l: clamp(2.00rem, calc(1.83rem + 0.87vw), 2.50rem);
          --space-xl: clamp(3.00rem, calc(2.74rem + 1.30vw), 3.75rem);
          --space-2xl: clamp(4.00rem, calc(3.65rem + 1.74vw), 5.00rem);
          --space-3xl: clamp(6.00rem, calc(5.48rem + 2.61vw), 7.50rem);

          /* One-up pairs */
          --space-3xs-2xs: clamp(0.25rem, calc(0.12rem + 0.65vw), 0.63rem);
          --space-2xs-xs: clamp(0.50rem, calc(0.35rem + 0.76vw), 0.94rem);
          --space-xs-s: clamp(0.75rem, calc(0.58rem + 0.87vw), 1.25rem);
          --space-s-m: clamp(1.00rem, calc(0.70rem + 1.52vw), 1.88rem);
          --space-m-l: clamp(1.50rem, calc(1.15rem + 1.74vw), 2.50rem);
          --space-l-xl: clamp(2.00rem, calc(1.39rem + 3.04vw), 3.75rem);
          --space-xl-2xl: clamp(3.00rem, calc(2.30rem + 3.48vw), 5.00rem);
          --space-2xl-3xl: clamp(4.00rem, calc(2.78rem + 6.09vw), 7.50rem);

          /* Custom pairs */
          --space-s-l: clamp(1.00rem, calc(0.48rem + 2.61vw), 2.50rem);
        }

        *, *::before, *::after {
          box-sizing: border-box;
        }

        body {
          position: relative;
          margin: 0;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
        }

        main {
          max-width: 64ch;
          margin-inline: auto;
        }
      }

      @layer components {
        section {
          position: relative;
          padding: 2rem;
        }

        .fetching {
          pointer-events: none;
        }

        .fetching::after {
          content: '';
          position: absolute;
          inset: 0;
          background-color: rgb(0 0 0 / 0.2);
          pointer-events: none;
        }

        h3 {
          margin: 0;
          margin-bottom: 0.75rem;
        }

        .divider {
          margin: 2rem 0;
          border: none;
          border-bottom: 1px solid #ddd;
        }
      }

      @layer utilities {
        .grid {
          display: grid;
          align-items: center;
        }
      }

    </style>
  </head>

  <body>

  <main>
    <h1>Setup the app</h1>

    <section>
      <h3>Install app and set up webhooks</h3>
      <form action="/" method="POST">
        <input type="hidden" name="method" value="POST">
        <input type="text" name="shop" placeholder="handle.myshopify.com" value="handle.myshopify.com">
        <input type="text" name="accessToken" placeholder="Access Token">
        <button type="submit">Submit</button>
      </form>
      <pre></pre>
    </section>

    <hr class="divider" />

    <section>
      <h3>Uninstall app and delete webhooks</h3>
      <form action="/" method="POST">
        <input type="hidden" name="method" type="hidden" value="DELETE">
        <input type="text" name="shop" placeholder="handle.myshopify.com" value="handle.myshopify.com">
        <input type="text" name="accessToken" placeholder="Access Token">
        <button type="submit">Submit</button>
      </form>
      <pre></pre>
    </section>

    <hr class="divider" />

    <section>
      <h3>List all the registered webhooks</h3>
      <form action="/" method="POST">
        <input type="hidden" name="method" type="hidden" value="GET">
        <input type="text" name="shop" placeholder="handle.myshopify.com" value="handle.myshopify.com">
        <button type="submit">Submit</button>
      </form>
      <pre></pre>
    </section>
  </main>

  <script>
    (() => {
      const forms = Array.from(document.querySelectorAll('form'))

      forms.forEach(form => {
        const section = form.closest('section')
        const dump = section.querySelector('pre')
        const body = document.body

        form.addEventListener('submit', e => {
          e.preventDefault()
          const jsonBody = formDataToJson(form)
          console.log('Form data (JSON)', jsonBody)

          section.classList.add('fetching')
          body.classList.add('fetching')

          dump.innerHTML = '...'

          fetch(form.getAttribute('action'), {
            method: form.getAttribute('method'),
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(jsonBody),
          })
          .then(async r => {
            const status = r.status
            const json = await r.json()
            dump.innerHTML = JSON.stringify({
              statusCode: status,
              ok: r.ok,
              json,
            }, null, 2)
          })
          .catch(e => {
            console.error(e);

            dump.innerHTML = JSON.stringify({
              error: 'Client side parsing error.',
              details: 'Either Network is not reachable or server sent a bad response. Check console.',
              message: e?.message
            }, null, 2)
          })
          .finally(() => {
            section.classList.remove('fetching')
            body.classList.remove('fetching')
          })
        })
      })

      function formDataToJson(formOrFormData) {
        const formData = formOrFormData instanceof HTMLFormElement ? new FormData(formOrFormData) : formOrFormData
        if (!(formData instanceof FormData)) {
          throw new Error('Please provide form element or FormData as input')
        }
        const json = {}

        formData.forEach((value, key) => {
          if (json[key] !== undefined) {
            if (Array.isArray(json[key])) {
              json[key].push(value)
            } else {
              json[key] = [...json[key], value]
            }
          } else {
            json[key] = value
          }
        })

        return json
      }
    })();


    // Sync shop and tokens
    (() => {
      const shopInputs = Array.from(document.querySelectorAll('input[name="shop"]'))
      const accessTokenInputs = Array.from(document.querySelectorAll('input[name="accessToken"]'))

      shopInputs.forEach(input => {
        input.addEventListener('input', e => {
          const value = e.target.value
          shopInputs.forEach(inp => {
            if (inp !== input) {
              inp.value = value
            }
          })
        })
      })

      accessTokenInputs.forEach(input => {
        input.addEventListener('input', e => {
          const value = e.target.value
          accessTokenInputs.forEach(inp => {
            if (inp !== input) {
              inp.value = value
            }
          })
        })
      })

    })();
  </script>

  </body>
</html>
`;
