provider "aws" {
  region = "ap-south-1"
}

resource "aws_security_group" "deployment_tracker_sg" {
  name        = "launch-wizard-2"
  description = "launch-wizard-2 created 2026-07-20T10:13:01.903Z"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3003
    to_port     = 3003
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 9090
    to_port     = 9090
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_iam_role" "ec2_ecr_role" {
  name = "deployment-tracker-ec2-ecr-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecr_read_only" {
  role       = aws_iam_role.ec2_ecr_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_instance_profile" "ec2_ecr_profile" {
  name = "deployment-tracker-ec2-ecr-profile"
  role = aws_iam_role.ec2_ecr_role.name
}

resource "aws_instance" "deployment_tracker" {
  ami                    = "ami-01a00762f46d584a1"
  instance_type          = "m7i-flex.large"
  availability_zone      = "ap-south-1b"
  subnet_id              = "subnet-0fedb31ec9a8e8c0e"
  vpc_security_group_ids = [aws_security_group.deployment_tracker_sg.id]
  key_name               = "updated-DT"
  iam_instance_profile   = aws_iam_instance_profile.ec2_ecr_profile.name

  tags = {
    Name = "updated_DT"
  }

  root_block_device {
    volume_size           = 30
    volume_type            = "gp3"
    delete_on_termination  = true
  }
}

resource "aws_ecr_repository" "deployment_tracker" {
  name                 = "deployment-tracker"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_sns_topic" "deployment_tracker_alerts" {
  name = "deployment-tracker-alerts"
}

resource "aws_sns_topic_subscription" "email_alert" {
  topic_arn = aws_sns_topic.deployment_tracker_alerts.arn
  protocol  = "email"
  endpoint  = "unfilteredvivek@gmail.com"
}

resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "deployment-tracker-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods   = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Triggers when EC2 CPU utilization exceeds 80% for 10 minutes"
  alarm_actions       = [aws_sns_topic.deployment_tracker_alerts.arn]
  ok_actions          = [aws_sns_topic.deployment_tracker_alerts.arn]

  dimensions = {
    InstanceId = aws_instance.deployment_tracker.id
  }
}

resource "aws_db_subnet_group" "deployment_tracker_db_subnet_group" {
  name       = "deployment-tracker-db-subnet-group"
  subnet_ids = [
    "subnet-0209fd89fdb2fe65d",
    "subnet-02b42bbd3a37b0443",
    "subnet-0fedb31ec9a8e8c0e"
  ]

  tags = {
    Name = "deployment-tracker-db-subnet-group"
  }
}

resource "aws_security_group" "rds_sg" {
  name        = "deployment-tracker-rds-sg"
  description = "Allow Postgres access only from the app EC2 instance"
  vpc_id      = "vpc-00166024539e79825"

  ingress {
    description     = "Postgres from EC2 app instance"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.deployment_tracker_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "deployment-tracker-rds-sg"
  }
}

resource "aws_db_instance" "deployment_tracker_db" {
  identifier             = "deployment-tracker-db"
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = "db.t3.micro"
  allocated_storage      = 20
  storage_type           = "gp2"
  db_name                = "deployment_tracker"
  username               = "dt_admin"
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.deployment_tracker_db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  publicly_accessible    = false
  skip_final_snapshot    = true

  tags = {
    Name = "deployment-tracker-db"
  }
}
