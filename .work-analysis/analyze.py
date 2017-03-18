from __future__ import division
import pandas as pd
import matplotlib.pyplot as plt

def calculate_hours(time):
    hours, minutes, seconds = [ int(n) for n in time.split(':') ]
    return hours + (minutes / 60) + (seconds / 3600)

def is_weekend(weekday):
    return weekday == 'Sun' or weekday == 'Sat'

names = [ 'weekday', 'month', 'day', 'time', 'year' ]
data = pd.read_csv('./join-monster.log', sep=' ', header=None, names=names)
grouped = data.groupby([ 'year', 'month', 'day', 'weekday' ]).aggregate(lambda x: tuple(x))
grouped.time = grouped.time.apply(lambda tup: tuple(calculate_hours(t) for t in tup))

i = 0
during_workday = 0
late_night = 0
total = 0
for label, row in grouped.iterrows():
    # label (2017, 'Mar', 15, 'Wed')
    i += 1
    for time in row['time']:
        total += 1
        if 0 < time < 6:
            late_night += 1
        if 10 < time < 18 and not is_weekend(label[3]):
            plt.scatter(i, time, color='red')
            during_workday += 1
        else:
            plt.scatter(i, time, color='blue')

print('%f%% commits during workday' % (during_workday / total * 100))
print('%f%% commits between midnight and 6a.m.' % (late_night / total * 100))

plt.savefig('plot3.png')

