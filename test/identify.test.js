import {graphql} from 'graphql';
import schemaBasic from '../test-api/schema-basic/index';
import {partial} from 'lodash';
import {errCheck} from './helpers/_util';

function wrap(query) {
  return `{
    users { ${query} }
  }`;
}

const run = partial(graphql, schemaBasic);

test('it should handle a where condition', async () => {
  const query = `{
    user(id: 1) {
      fullName
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    user: {fullName: 'andrew carlson'},
  };
  expect(expected).toEqual(data);
});

test('it should handle an async where condition', async () => {
  const query = `{
    user(idAsync: 1) {
      fullName
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    user: {fullName: 'andrew carlson'},
  };
  expect(expected).toEqual(data);
});

test('a query with a sqlDeps as the first requested field should not mess it up', async () => {
  const query = wrap('numFeet, fullName, id');
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    users: [
      {
        numFeet: 2,
        fullName: 'andrew carlson',
        id: 1,
      },
      {
        numFeet: 2,
        fullName: 'matt elder',
        id: 2,
      },
      {
        numFeet: 2,
        fullName: 'foo bar',
        id: 3,
      },
    ],
  };
  expect(expected).toEqual(data);
});

test('it should handle a single object in which the first requested field is a list', async () => {
  const query = `{
    user(id: 2) {
      posts { id, body }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    user: {
      posts: [
        {
          id: 1,
          body: 'If I could marry a programming language, it would be Haskell.',
        },
        {
          id: 3,
          body: 'Here is who to contact if your brain has been ruined by Java.',
        },
      ],
    },
  };
  expect(expected).toEqual(data);
});

test('it should handle composite keys', async () => {
  const query = `{
    sponsors {
      numLegs, lastName
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    sponsors: [
      {numLegs: 2, lastName: 'bachman'},
      {numLegs: 2, lastName: 'bachman'},
      {numLegs: 2, lastName: 'bachman'},
      {numLegs: 2, lastName: 'bachman'},
      {numLegs: 2, lastName: 'daemon'},
    ],
  };
  expect(expected).toEqual(data);
});
