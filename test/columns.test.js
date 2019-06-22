import {graphql} from 'graphql';
import {toGlobalId} from 'graphql-relay';
import schemaBasic from '../test-api/schema-basic/index';
import {partial} from 'lodash';
import {errCheck} from './helpers/_util';

function wrap(query) {
  return `{
    users { ${query} }
  }`;
}

const run = partial(graphql, schemaBasic);

test('get a field with the same name as the SQL column', async () => {
  const query = wrap('id');
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data).toEqual({
    users: [{id: 1}, {id: 2}, {id: 3}],
  });
});

test('get a field with a different SQL column name and field name', async () => {
  const query = wrap('email');
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data).toEqual({
    users: [
      {email: 'andrew@stem.is'},
      {email: 'matt@stem.is'},
      {email: 'foo@example.org'},
    ],
  });
});

test('get a field that has a resolver on top of the SQL column', async () => {
  const query = wrap('idEncoded');
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data).toEqual({
    users: [{idEncoded: 'MQ=='}, {idEncoded: 'Mg=='}, {idEncoded: 'Mw=='}],
  });
});

test('get a globalID field', async () => {
  const query = wrap('globalId');
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data).toEqual({
    users: [
      {globalId: toGlobalId('User', 1)},
      {globalId: toGlobalId('User', 2)},
      {globalId: toGlobalId('User', 3)},
    ],
  });
});

test('get a field that depends on multiple sql columns', async () => {
  const query = wrap('fullName');
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data).toEqual({
    users: [
      {fullName: 'andrew carlson'},
      {fullName: 'matt elder'},
      {fullName: 'foo bar'},
    ],
  });
});

test('it should disambiguate two entities with identical fields', async () => {
  const query = wrap('numLegs');
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    users: [
      {numLegs: 2}, // andy
      {numLegs: 2}, // matt
      {numLegs: 2},
    ],
  };
  expect(expected).toEqual(data);
});

test('it should handle fragments at the top level', async () => {
  const query = `
    {
      users {
        ...F0
      }
    }
    fragment F0 on User { id }
  `;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    users: [{id: 1}, {id: 2}, {id: 3}],
  };
  expect(expected).toEqual(data);
});

test('it should handle an inline fragment', async () => {
  const query = `
    {
      users {
        ... on User { fullName }
      }
    }
  `;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    users: [
      {fullName: 'andrew carlson'},
      {fullName: 'matt elder'},
      {fullName: 'foo bar'},
    ],
  };
  expect(expected).toEqual(data);
});

test('it should handle nested fragments', async () => {
  const query = `
    {
      users {
        ... on User {
          ...info
        }
      }
    }
    fragment info on User {
      id, fullName, email
    }
  `;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    users: [
      {id: 1, fullName: 'andrew carlson', email: 'andrew@stem.is'},
      {id: 2, fullName: 'matt elder', email: 'matt@stem.is'},
      {id: 3, fullName: 'foo bar', email: 'foo@example.org'},
    ],
  };
  expect(expected).toEqual(data);
});

test('it should handle named fragments on an interface', async () => {
  const query = `
    {
      sponsors {
        ...info
      }
      user(id: 1) {
        ...info
      }
    }

    fragment info on Person {
      fullName
      ... on User {
        email
      }
      ... on Sponsor {
        generation
      }
    }
  `;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    sponsors: [
      {fullName: 'erlich bachman', generation: 1},
      {fullName: 'andrew bachman', generation: 1},
      {fullName: 'erlich bachman', generation: 2},
      {fullName: 'matt bachman', generation: 2},
      {fullName: 'matt daemon', generation: 1},
    ],
    user: {fullName: 'andrew carlson', email: 'andrew@stem.is'},
  };
  expect(expected).toEqual(data);
});

test('it should handle inline fragments on an interface', async () => {
  const query = `
    {
      sponsors {
        ...on Person {
          fullName
          ... on User {
            email
          }
          ... on Sponsor {
            generation
          }
        }
      }
      user(id: 1) {
        ...on Person {
          fullName
          ... on User {
            email
          }
          ... on Sponsor {
            generation
          }
        }
      }
    }
  `;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    sponsors: [
      {fullName: 'erlich bachman', generation: 1},
      {fullName: 'andrew bachman', generation: 1},
      {fullName: 'erlich bachman', generation: 2},
      {fullName: 'matt bachman', generation: 2},
      {fullName: 'matt daemon', generation: 1},
    ],
    user: {fullName: 'andrew carlson', email: 'andrew@stem.is'},
  };
  expect(expected).toEqual(data);
});

test('it should handle a column that resolves independantly of SQL', async () => {
  const query = wrap('id, favNums');
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    users: [
      {id: 1, favNums: [1, 2, 3]},
      {id: 2, favNums: [1, 2, 3]},
      {id: 3, favNums: [1, 2, 3]},
    ],
  };
  expect(expected).toEqual(data);
});

test('it should handle a query that gets nothing from the database', async () => {
  const query = `{
    user(id:2) {
      favNums
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    user: {favNums: [1, 2, 3]},
  };
  expect(expected).toEqual(data);
});

test('it should handle duplicate fields', async () => {
  const query = wrap('id id id id idEncoded fullName fullName');
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    users: [
      {id: 1, idEncoded: 'MQ==', fullName: 'andrew carlson'},
      {id: 2, idEncoded: 'Mg==', fullName: 'matt elder'},
      {id: 3, idEncoded: 'Mw==', fullName: 'foo bar'},
    ],
  };
  expect(expected).toEqual(data);
});

test('it should not be tripped up by the introspection queries', async () => {
  const query = wrap('__typename');
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    users: [{__typename: 'User'}, {__typename: 'User'}, {__typename: 'User'}],
  };
  expect(expected).toEqual(data);
});

test('it should handle numeric variables', async () => {
  const query = `
    query user($userId: Int) {
      user(id: $userId) {
        id
        fullName
      }
    }
  `;
  const variables = {userId: 1};
  const {data, errors} = await graphql(
    schemaBasic,
    query,
    null,
    null,
    variables
  );
  errCheck(errors);
  const expected = {
    user: {
      id: 1,
      fullName: 'andrew carlson',
    },
  };
  expect(expected).toEqual(data);
});

test('it should handle string variables', async () => {
  const query = `
    query user($encodedUserId: String) {
      user(idEncoded: $encodedUserId) {
        idEncoded
        fullName
      }
    }
  `;
  const variables = {encodedUserId: 'MQ=='};
  const {data, errors} = await graphql(
    schemaBasic,
    query,
    null,
    null,
    variables
  );
  errCheck(errors);
  const expected = {
    user: {
      idEncoded: 'MQ==',
      fullName: 'andrew carlson',
    },
  };
  expect(expected).toEqual(data);
});

test('it should handle boolean variables', async () => {
  const query = `
    query sponsors($filter: Boolean) {
      sponsors(filterLegless: $filter) {
        numLegs
      }
    }
  `;
  const variables = {filter: true};
  const {data, errors} = await graphql(
    schemaBasic,
    query,
    null,
    null,
    variables
  );
  errCheck(errors);
  const expected = {
    sponsors: [],
  };
  expect(expected).toEqual(data);
});

test('it should handle raw SQL expressions', async () => {
  const query = `{
    user(id: 2) {
      fullName
      capitalizedLastName
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data.user.fullName.split(' ')[1].toUpperCase()).toBe(
    data.user.capitalizedLastName
  );
});
