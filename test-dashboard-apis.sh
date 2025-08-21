#!/bin/bash

# Test script for dashboard APIs
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGE2ZDVlZDg4OGM5Yzc5ODU0ZmE5OGUiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwiaWF0IjoxNzU1NzY0MjA1LCJleHAiOjE3NTU3NjUxMDUsImF1ZCI6InNraWxsc3luYy11c2VycyIsImlzcyI6InNraWxsc3luYy1wbGF0Zm9ybSJ9.upgb8RBTNFGEqx8xzcS02umVHLPlmcQXGfOXmeNmQCc"

echo "Testing Dashboard APIs..."
echo "========================"

echo -e "\n1. Testing /api/dashboard/stats"
curl -s -X GET http://localhost:3000/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n2. Testing /api/dashboard/activity"
curl -s -X GET http://localhost:3000/api/dashboard/activity \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n3. Testing /api/dashboard/analytics"
curl -s -X GET http://localhost:3000/api/dashboard/analytics \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n4. Testing /api/dashboard/sessions"
curl -s -X GET http://localhost:3000/api/dashboard/sessions \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n5. Testing /api/dashboard/suggestions"
curl -s -X GET http://localhost:3000/api/dashboard/suggestions \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n6. Testing /api/dashboard/achievements/recent"
curl -s -X GET http://localhost:3000/api/dashboard/achievements/recent \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\nAll tests completed!"
