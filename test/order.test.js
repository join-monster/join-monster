import {graphql} from 'graphql';
import schemaBasic from '../test-api/schema-basic/index';
import {partial} from 'lodash';
import {errCheck} from './helpers/_util';

function makeQuery(asc) {
  return `{
    user(id: 1) {
      posts {
        id
        comments(asc:${asc}) {
          id
        }
      }
      comments {
        id
      }
    }
  }`;
}

const run = partial(graphql, schemaBasic);

test('it should handle nested ordering with both ASC', async () => {
  const query = makeQuery(true);
  const {data, errors} = await run(query);
  errCheck(errors);
  expect([{id: 4}, {id: 5}, {id: 6}, {id: 7}, {id: 8}]).toEqual(
    data.user.posts[0].comments
  );
  expect([{id: 1}, {id: 4}, {id: 6}, {id: 8}]).toEqual(data.user.comments);
});

test('it should handle nested ordering with one ASC and one DESC', async () => {
  const query = makeQuery(false);
  const {data, errors} = await run(query);
  errCheck(errors);
  expect([{id: 8}, {id: 7}, {id: 6}, {id: 5}, {id: 4}]).toEqual(
    data.user.posts[0].comments
  );
  expect([{id: 1}, {id: 4}, {id: 6}, {id: 8}]).toEqual(data.user.comments);
});

test('it should handle order on many-to-many', async () => {
  const query = `{
    user(id: 3) {
      fullName
      following {
        id
        fullName
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    user: {
      fullName: 'foo bar',
      following: [
        {
          id: 1,
          fullName: 'andrew carlson',
        },
        {
          id: 2,
          fullName: 'matt elder',
        },
      ],
    },
  };
  expect(expected).toEqual(data);
});

test('it sould handle order on many-to-many', async () => {
  const query = `{
    user(id: 3) {
      fullName
      following(oldestFirst: true) {
        id
        fullName
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    user: {
      fullName: 'foo bar',
      following: [
        {
          id: 2,
          fullName: 'matt elder',
        },
        {
          id: 1,
          fullName: 'andrew carlson',
        },
      ],
    },
  };
  expect(expected).toEqual(data);
});
