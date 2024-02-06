# Update s3 secrets
echo "Updating s3 secrets for $(kubectl config current-context)"
kubectl patch secrets openstad-s3 --type json -p='[{"op": "replace", "path": "/data/bucket", "value": "MDQwMDItZHJhYWQ="},{"op": "replace", "path": "/data/endpoint", "value": "aHR0cHM6Ly9vYmplY3RzdG9yZS50cnVlLm5sLw=="}, {"op": "replace", "path": "/data/key", "value": "MlFaSlVTSDQxUlo4NDlBVkc0OEY="}, {"op": "replace", "path": "/data/secret", "value": "THU1U2F2UlcvelRIUlFXTHVPRHlGUkNPYjdEeVdSY3ZZWTQvd1dvYw=="}]'

# Update image for mysql & mongodb cronjob
NEW_IMAGE="draadnl/openstad-api:release-wolkenstad-20-11-14a6aec-7724039245"

mongodb_cronjob=$(kubectl get cronjob | grep mongodb | awk '{print $1}')
mysql_cronjob=$(kubectl get cronjob | grep mysql | awk '{print $1}')

echo "Updating image for $mongodb_cronjob"
kubectl patch cronjob $mongodb_cronjob --type json -p='[{"op": "replace", "path": "/spec/jobTemplate/spec/template/spec/containers/0/image", "value": "'$NEW_IMAGE'"}, {"op": "replace", "path": "/spec/jobTemplate/spec/template/spec/containers/0/image", "value": "'$NEW_IMAGE'"}]'

echo "Updating image for $mysql_cronjob"
kubectl patch cronjob $mysql_cronjob --type json -p='[{"op": "replace", "path": "/spec/jobTemplate/spec/template/spec/containers/0/image", "value": "'$NEW_IMAGE'"}]'

echo "Setting S3_DELETE_AFTER_DAYS to 14"
kubectl set env cronjob/$mongodb_cronjob S3_DELETE_AFTER_DAYS=14
kubectl set env cronjob/$mysql_cronjob S3_DELETE_AFTER_DAYS=14
