# chek user updated record
Two steps — first get a token, then update:

1. Login to get a token:

```bash
curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' | python3 -m json.tool
```

2. Update profile (replace <TOKEN> with the access_token from above):

```bash
curl -s -X PUT http://localhost:8000/users/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"name":"New Name","email":"admin@example.com","avatar_mode":"letter","avatar_base64":null}' \
  | python3 -m json.tool
```

3. Verify with GET /users/me:

```bash
curl -s http://localhost:8000/users/me \
  -H "Authorization: Bearer <TOKEN>" \
  | python3 -m json.tool
```

Or as a one-liner that chains all three automatically:

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])") \
&& curl -s http://localhost:8000/users/me \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```