NAMESPACES=$(kubectl get ns | grep openstad- | awk '{print $1}')

# loop through namespaces
for NAMESPACE in $NAMESPACES
do
echo "Updating cron schedule for $NAMESPACE"

# get current schedule
new_schedule_mongo=$(kubectl -n $NAMESPACE get cronjob $NAMESPACE-api-cronjob-mongodb -o yaml | grep schedule: | awk '{print $2 " " $3 " */2 " $5 " " $6}')
new_schedule_mysql=$(kubectl -n $NAMESPACE get cronjob $NAMESPACE-api-cronjob-mysql -o yaml | grep schedule: | awk '{print $2 " " $3 " */2 " $5 " " $6}')

echo "New schedule $NAMESPACE Mongodb: $new_schedule_mongo"
echo "New schedule $NAMESPACE Mysql: $new_schedule_mysql"

kubectl -n $NAMESPACE patch cronjob $NAMESPACE-api-cronjob-mongodb --type json -p="[{\"op\": \"replace\", \"path\": \"/spec/schedule\", \"value\": \"$new_schedule_mongo\"}]"
kubectl -n $NAMESPACE patch cronjob $NAMESPACE-api-cronjob-mysql --type json -p="[{\"op\": \"replace\", \"path\": \"/spec/schedule\", \"value\": \"$new_schedule_mysql\"}]"
done
