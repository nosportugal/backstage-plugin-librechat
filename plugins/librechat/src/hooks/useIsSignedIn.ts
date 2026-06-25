import {useState, useEffect} from "react";
import {useApi, identityApiRef} from "@backstage/frontend-plugin-api";

/**
 * Hook that resolves whether a user is currently signed in to Backstage.
 *
 * The identity promise only resolves once authentication completes, so this
 * stays `false` while the sign-in page is shown and flips to `true` once the
 * user is authenticated. Used to keep the chat bubble hidden on the login page.
 */
export function useIsSignedIn(): boolean {
  const identityApi = useApi(identityApiRef);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    identityApi
      .getBackstageIdentity()
      .then((identity) => {
        if (active) {
          setSignedIn(Boolean(identity?.userEntityRef));
        }
      })
      .catch(() => {
        if (active) {
          setSignedIn(false);
        }
      });
    return () => {
      active = false;
    };
  }, [identityApi]);

  return signedIn;
}
