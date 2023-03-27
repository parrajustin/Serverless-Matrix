import { http } from '@google-cloud/functions-framework';
import { SupportedVersions } from './version';
import { HandleMethod } from './method';
import { GetPolicy } from './policy';
import { GetAccount, LogoutAccount, RegisterAccount } from './account';
import { noop } from 'lodash';

//
// API Version check
//

// Gets the supported identify api versions. Url "/_matrix/identity/versions".
http('Versions', (req, res) => {
  HandleMethod(req, res, {
    GET: () => {
      res.status(200).json({
        versions: SupportedVersions(),
      });
    },
  });
});

// Authentication. Url "/_matrix/identity/v2/account".
http('GetAccount', (req, res) => {
  HandleMethod(req, res, {
    GET: () => {
      GetAccount(req, res).finally(() => {
        noop();
      });
    },
  });
});

http('LogoutAccount', (req, res) => {
  HandleMethod(req, res, {
    POST: () => {
      LogoutAccount(req, res).finally(() => {
        noop();
      });
    },
  });
});

http('RegisterAccount', (req, res) => {
  HandleMethod(req, res, {
    POST: () => {
      RegisterAccount(req, res).finally(() => {
        noop();
      });
    },
  });
});

// Terms of service. Url "/_matrix/identity/v2/terms".
http('GetTerms', (req, res) => {
  HandleMethod(req, res, {
    GET: () => {
      res.status(200).json(GetPolicy());
    },
    POST: () => {
      // TODO: need to add term verification
      res.status(200).json({});
    },
  });
});

// Status Check. Url "/_matrix/identity/v2".
http('Status', (req, res) => {
  HandleMethod(req, res, {
    GET: () => {
      res.status(200).json({});
    },
  });
});
